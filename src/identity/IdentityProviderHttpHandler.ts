import type { ErrorHandler } from '../ldp/http/ErrorHandler';
import type { RequestParser } from '../ldp/http/RequestParser';
import { OkResponseDescription } from '../ldp/http/response/OkResponseDescription';
import { RedirectResponseDescription } from '../ldp/http/response/RedirectResponseDescription';
import type { ResponseDescription } from '../ldp/http/response/ResponseDescription';
import type { ResponseWriter } from '../ldp/http/ResponseWriter';
import type { Operation } from '../ldp/operations/Operation';
import { BasicRepresentation } from '../ldp/representation/BasicRepresentation';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpHandlerInput } from '../server/HttpHandler';
import { HttpHandler } from '../server/HttpHandler';
import type { HttpRequest } from '../server/HttpRequest';
import type { HttpResponse } from '../server/HttpResponse';
import type { RepresentationConverter } from '../storage/conversion/RepresentationConverter';
import { APPLICATION_JSON } from '../util/ContentTypes';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import { assertError, createErrorMessage } from '../util/errors/ErrorUtil';
import { InternalServerError } from '../util/errors/InternalServerError';
import { joinUrl, trimTrailingSlashes } from '../util/PathUtil';
import { addTemplateMetadata } from '../util/ResourceUtil';
import type { ProviderFactory } from './configuration/ProviderFactory';
import type {
  Interaction,
  InteractionHandler,
  InteractionHandlerResult,
  InteractionResponseResult,
} from './interaction/email-password/handler/InteractionHandler';
import { IdpInteractionError } from './interaction/util/IdpInteractionError';
import type { InteractionCompleter } from './interaction/util/InteractionCompleter';

const API_VERSION = '0.1';

/**
 * All the information that is required to handle a request to a custom IDP path.
 */
export class InteractionRoute {
  public readonly route: RegExp;
  public readonly handler: InteractionHandler;
  public readonly viewTemplates: Record<string, string>;
  public readonly prompt?: string;
  public readonly responseTemplates: Record<string, string>;

  /**
   * @param route - Regex to match this route.
   * @param viewTemplates - Templates to render on GET requests.
   *                        Keys are content-types, values paths to a template.
   * @param handler - Handler to call on POST requests.
   * @param prompt - In case of requests to the IDP entry point, the session prompt will be compared to this.
   *                 One entry should have a value of "default" here in case there are no prompt matches.
   * @param responseTemplates - Templates to render as a response to POST requests when required.
   *                            Keys are content-types, values paths to a template.
   */
  public constructor(route: string,
    viewTemplates: Record<string, string>,
    handler: InteractionHandler,
    prompt?: string,
    responseTemplates: Record<string, string> = {}) {
    this.route = new RegExp(route, 'u');
    this.viewTemplates = viewTemplates;
    this.handler = handler;
    this.prompt = prompt;
    this.responseTemplates = responseTemplates;
  }
}

/**
 * Handles all requests relevant for the entire IDP interaction,
 * by sending them to either a matching {@link InteractionRoute},
 * or the generated Provider from the {@link ProviderFactory} if there is no match.
 *
 * The InteractionRoutes handle all requests where we need custom behaviour,
 * such as everything related to generating and validating an account.
 * The Provider handles all the default request such as the initial handshake.
 *
 * This handler handles all requests since it assumes all those requests are relevant for the IDP interaction.
 * A {@link RouterHandler} should be used to filter out other requests.
 */
export class IdentityProviderHttpHandler extends HttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly baseUrl: string;
  private readonly requestParser: RequestParser;
  private readonly providerFactory: ProviderFactory;
  private readonly interactionRoutes: InteractionRoute[];
  private readonly converter: RepresentationConverter;
  private readonly interactionCompleter: InteractionCompleter;
  private readonly errorHandler: ErrorHandler;
  private readonly responseWriter: ResponseWriter;

  /**
   * @param baseUrl - Base URL of the server.
   * @param idpPath - Relative path of the IDP entry point.
   * @param requestParser - Used for parsing requests.
   * @param providerFactory - Used to generate the OIDC provider.
   * @param interactionRoutes - All routes handling the custom IDP behaviour.
   * @param converter - Used for content negotiation..
   * @param interactionCompleter - Used for POST requests that need to be handled by the OIDC library.
   * @param errorHandler - Converts errors to responses.
   * @param responseWriter - Renders error responses.
   */
  public constructor(
    baseUrl: string,
    idpPath: string,
    requestParser: RequestParser,
    providerFactory: ProviderFactory,
    interactionRoutes: InteractionRoute[],
    converter: RepresentationConverter,
    interactionCompleter: InteractionCompleter,
    errorHandler: ErrorHandler,
    responseWriter: ResponseWriter,
  ) {
    super();
    // Trimming trailing slashes so the relative URL starts with a slash after slicing this off
    this.baseUrl = trimTrailingSlashes(joinUrl(baseUrl, idpPath));
    this.requestParser = requestParser;
    this.providerFactory = providerFactory;
    this.interactionRoutes = interactionRoutes;
    this.converter = converter;
    this.interactionCompleter = interactionCompleter;
    this.errorHandler = errorHandler;
    this.responseWriter = responseWriter;
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    let preferences: RepresentationPreferences = { type: { 'text/plain': 1 }};
    try {
      // It is important that this RequestParser does not read out the Request body stream.
      // Otherwise we can't pass it anymore to the OIDC library when needed.
      const operation = await this.requestParser.handleSafe(request);
      ({ preferences } = operation);
      await this.handleOperation(operation, request, response);
    } catch (error: unknown) {
      assertError(error);
      const result = await this.errorHandler.handleSafe({ error, preferences });
      await this.responseWriter.handleSafe({ response, result });
    }
  }

  /**
   * Finds the matching route and resolves the operation.
   */
  private async handleOperation(operation: Operation, request: HttpRequest, response: HttpResponse): Promise<void> {
    // This being defined means we're in an OIDC session
    let oidcInteraction: Interaction | undefined;
    try {
      const provider = await this.providerFactory.getProvider();
      oidcInteraction = await provider.interactionDetails(request, response);
    } catch {
      // Just a regular request
    }

    // If our own interaction handler does not support the input, it is either invalid or a request for the OIDC library
    const route = await this.findRoute(operation, oidcInteraction);
    if (!route) {
      const provider = await this.providerFactory.getProvider();
      this.logger.debug(`Sending request to oidc-provider: ${request.url}`);
      return provider.callback(request, response);
    }

    // IDP handlers expect JSON data
    if (operation.body) {
      const args = {
        representation: operation.body,
        preferences: { type: { [APPLICATION_JSON]: 1 }},
        identifier: operation.target,
      };
      operation.body = await this.converter.handleSafe(args);
    }

    const { result, templateFiles } = await this.resolveRoute(operation, route, oidcInteraction);
    const responseDescription =
      await this.handleInteractionResult(operation, request, result, templateFiles, oidcInteraction);
    await this.responseWriter.handleSafe({ response, result: responseDescription });
  }

  /**
   * Finds a route that supports the given request.
   */
  private async findRoute(operation: Operation, oidcInteraction?: Interaction): Promise<InteractionRoute | undefined> {
    if (!operation.target.path.startsWith(this.baseUrl)) {
      // This is either an invalid request or a call to the .well-known configuration
      return;
    }
    const pathName = operation.target.path.slice(this.baseUrl.length);
    let route = this.getRouteMatch(pathName);

    // In case the request targets the IDP entry point the prompt determines where to go
    if (!route && oidcInteraction && trimTrailingSlashes(pathName).length === 0) {
      route = this.getPromptMatch(oidcInteraction.prompt.name);
    }
    return route;
  }

  /**
   * Handles the behaviour of an InteractionRoute.
   * Will error if the route does not support the given request.
   *
   * GET requests return a default response result,
   * POST requests to the specific InteractionHandler of the route.
   */
  private async resolveRoute(operation: Operation, route: InteractionRoute, oidcInteraction?: Interaction):
  Promise<{ result: InteractionHandlerResult; templateFiles: Record<string, string> }> {
    if (operation.method === 'GET') {
      // .ejs templates errors on undefined variables
      return {
        result: { type: 'response', details: { errorMessage: '', prefilled: {}}},
        templateFiles: route.viewTemplates,
      };
    }

    if (operation.method === 'POST') {
      try {
        const result = await route.handler.handleSafe({ operation, oidcInteraction });
        return { result, templateFiles: route.responseTemplates };
      } catch (error: unknown) {
        // Render error in the view
        const prefilled = IdpInteractionError.isInstance(error) ? error.prefilled : {};
        const errorMessage = createErrorMessage(error);
        return {
          result: { type: 'response', details: { errorMessage, prefilled }},
          templateFiles: route.viewTemplates,
        };
      }
    }

    throw new BadRequestHttpError(`Unsupported request: ${operation.method} ${operation.target.path}`);
  }

  /**
   * Creates a ResponseDescription based on the InteractionHandlerResult.
   * This will either be a redirect if type is "complete" or a data stream if the type is "response".
   */
  private async handleInteractionResult(operation: Operation, request: HttpRequest, result: InteractionHandlerResult,
    templateFiles: Record<string, string>, oidcInteraction?: Interaction): Promise<ResponseDescription> {
    let responseDescription: ResponseDescription | undefined;

    if (result.type === 'complete') {
      if (!oidcInteraction) {
        throw new BadRequestHttpError(
          'This action can only be performed as part of an OIDC authentication flow.',
          { errorCode: 'E0002' },
        );
      }
      // Create a redirect URL with the OIDC library
      const location = await this.interactionCompleter.handleSafe({ ...result.details, request });
      responseDescription = new RedirectResponseDescription(location);
    } else {
      // Convert the response object to a data stream
      responseDescription = await this.handleResponseResult(result, templateFiles, operation, oidcInteraction);
    }

    return responseDescription;
  }

  /**
   * Converts an InteractionResponseResult to a ResponseDescription by first converting to a Representation
   * and applying necessary conversions.
   */
  private async handleResponseResult(result: InteractionResponseResult, templateFiles: Record<string, string>,
    operation: Operation, oidcInteraction?: Interaction): Promise<ResponseDescription> {
    // Convert the object to a valid JSON representation
    const json = { ...result.details, authenticating: Boolean(oidcInteraction), apiVersion: API_VERSION };
    const representation = new BasicRepresentation(JSON.stringify(json), operation.target, APPLICATION_JSON);

    // Template metadata is required for conversion
    for (const [ type, templateFile ] of Object.entries(templateFiles)) {
      addTemplateMetadata(representation.metadata, templateFile, type);
    }

    // Potentially convert the Representation based on the preferences
    const args = { representation, preferences: operation.preferences, identifier: operation.target };
    const converted = await this.converter.handleSafe(args);

    return new OkResponseDescription(converted.metadata, converted.data);
  }

  /**
   * Find a route by matching the URL.
   */
  private getRouteMatch(url: string): InteractionRoute | undefined {
    for (const route of this.interactionRoutes) {
      if (route.route.test(url)) {
        return route;
      }
    }
  }

  /**
   * Find a route by matching the prompt.
   */
  private getPromptMatch(prompt: string): InteractionRoute {
    let def: InteractionRoute | undefined;
    for (const route of this.interactionRoutes) {
      if (route.prompt === prompt) {
        return route;
      }
      if (route.prompt === 'default') {
        def = route;
      }
    }
    if (!def) {
      throw new InternalServerError('No handler for the default session prompt has been configured.');
    }

    return def;
  }
}
