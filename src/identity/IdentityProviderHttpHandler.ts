import type { ErrorHandler } from '../ldp/http/ErrorHandler';
import type { RequestParser } from '../ldp/http/RequestParser';
import { OkResponseDescription } from '../ldp/http/response/OkResponseDescription';
import { RedirectResponseDescription } from '../ldp/http/response/RedirectResponseDescription';
import type { ResponseDescription } from '../ldp/http/response/ResponseDescription';
import type { ResponseWriter } from '../ldp/http/ResponseWriter';
import type { Operation } from '../ldp/operations/Operation';
import { BasicRepresentation } from '../ldp/representation/BasicRepresentation';
import { getLoggerFor } from '../logging/LogUtil';
import { BaseHttpHandler } from '../server/BaseHttpHandler';
import type { BaseHttpHandlerArgs } from '../server/BaseHttpHandler';
import type { HttpRequest } from '../server/HttpRequest';
import type { HttpResponse } from '../server/HttpResponse';
import type { RepresentationConverter } from '../storage/conversion/RepresentationConverter';
import { APPLICATION_JSON } from '../util/ContentTypes';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import { createErrorMessage } from '../util/errors/ErrorUtil';
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

// Registration is not standardized within Solid yet, so we use a custom versioned API for now
const API_VERSION = '0.2';

/**
 * All the information that is required to handle a request to a custom IDP path.
 */
export class InteractionRoute {
  public readonly route: RegExp;
  public readonly handler: InteractionHandler;
  public readonly viewTemplates: Record<string, string>;
  public readonly prompt?: string;
  public readonly responseTemplates: Record<string, string>;
  public readonly controls: Record<string, string>;

  /**
   * @param route - Regex to match this route.
   * @param viewTemplates - Templates to render on GET requests.
   *                        Keys are content-types, values paths to a template.
   * @param handler - Handler to call on POST requests.
   * @param prompt - In case of requests to the IDP entry point, the session prompt will be compared to this.
   * @param responseTemplates - Templates to render as a response to POST requests when required.
   *                            Keys are content-types, values paths to a template.
   * @param controls - Controls to add to the response JSON.
   *                   The keys will be copied and the values will be converted to full URLs.
   */
  public constructor(route: string,
    viewTemplates: Record<string, string>,
    handler: InteractionHandler,
    prompt?: string,
    responseTemplates: Record<string, string> = {},
    controls: Record<string, string> = {}) {
    this.route = new RegExp(route, 'u');
    this.viewTemplates = viewTemplates;
    this.handler = handler;
    this.prompt = prompt;
    this.responseTemplates = responseTemplates;
    this.controls = controls;
  }
}

export interface IdentityProviderHttpHandlerArgs extends BaseHttpHandlerArgs {
  // Workaround for https://github.com/LinkedSoftwareDependencies/Components-Generator.js/issues/73
  requestParser: RequestParser;
  errorHandler: ErrorHandler;
  responseWriter: ResponseWriter;
  /**
   * Base URL of the server.
   */
  baseUrl: string;
  /**
   * Relative path of the IDP entry point.
   */
  idpPath: string;
  /**
   * Used to generate the OIDC provider.
   */
  providerFactory: ProviderFactory;
  /**
   * All routes handling the custom IDP behaviour.
   */
  interactionRoutes: InteractionRoute[];
  /**
   * Used for content negotiation.
   */
  converter: RepresentationConverter;
  /**
   * Used for POST requests that need to be handled by the OIDC library.
   */
  interactionCompleter: InteractionCompleter;
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
export class IdentityProviderHttpHandler extends BaseHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly baseUrl: string;
  private readonly providerFactory: ProviderFactory;
  private readonly interactionRoutes: InteractionRoute[];
  private readonly converter: RepresentationConverter;
  private readonly interactionCompleter: InteractionCompleter;

  private readonly controls: Record<string, string>;

  public constructor(args: IdentityProviderHttpHandlerArgs) {
    // It is important that the RequestParser does not read out the Request body stream.
    // Otherwise we can't pass it anymore to the OIDC library when needed.
    super(args);
    // Trimming trailing slashes so the relative URL starts with a slash after slicing this off
    this.baseUrl = trimTrailingSlashes(joinUrl(args.baseUrl, args.idpPath));
    this.providerFactory = args.providerFactory;
    this.interactionRoutes = args.interactionRoutes;
    this.converter = args.converter;
    this.interactionCompleter = args.interactionCompleter;

    this.controls = Object.assign(
      {},
      ...this.interactionRoutes.map((route): Record<string, string> => this.getRouteControls(route)),
    );
  }

  /**
   * Finds the matching route and resolves the operation.
   */
  protected async handleOperation(operation: Operation, request: HttpRequest, response: HttpResponse):
  Promise<ResponseDescription | undefined> {
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
      // Even though the typings do not indicate this, this is a Promise that needs to be awaited.
      // Otherwise the `BaseHttpServerFactory` will write a 404 before the OIDC library could handle the response.
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await provider.callback(request, response);
      return;
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
    return this.handleInteractionResult(operation, request, result, templateFiles, oidcInteraction);
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

    // In case the request targets the IDP entry point the prompt determines where to go
    const checkPrompt = oidcInteraction && trimTrailingSlashes(pathName).length === 0;

    for (const route of this.interactionRoutes) {
      if (checkPrompt) {
        if (route.prompt === oidcInteraction!.prompt.name) {
          return route;
        }
      } else if (route.route.test(pathName)) {
        return route;
      }
    }
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
      return { result: { type: 'response' }, templateFiles: route.viewTemplates };
    }

    if (operation.method === 'POST') {
      try {
        const result = await route.handler.handleSafe({ operation, oidcInteraction });
        return { result, templateFiles: route.responseTemplates };
      } catch (error: unknown) {
        // Render error in the view
        const errorMessage = createErrorMessage(error);
        const result: InteractionResponseResult = { type: 'response', details: { errorMessage }};
        if (IdpInteractionError.isInstance(error)) {
          result.details!.prefilled = error.prefilled;
        }
        return { result, templateFiles: route.viewTemplates };
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
    const json = {
      apiVersion: API_VERSION,
      ...result.details,
      authenticating: Boolean(oidcInteraction),
      controls: this.controls,
    };
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
   * Converts the controls object of a route to one with full URLs.
   */
  private getRouteControls(route: InteractionRoute): Record<string, string> {
    return Object.fromEntries(
      Object.entries(route.controls).map(([ name, path ]): [ string, string ] => [ name, joinUrl(this.baseUrl, path) ]),
    );
  }
}
