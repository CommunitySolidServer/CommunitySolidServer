import urljoin from 'url-join';
import type { ErrorHandler } from '../ldp/http/ErrorHandler';
import type { RequestParser } from '../ldp/http/RequestParser';
import { RedirectResponseDescription } from '../ldp/http/response/RedirectResponseDescription';
import type { ResponseWriter } from '../ldp/http/ResponseWriter';
import type { Operation } from '../ldp/operations/Operation';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpHandlerInput } from '../server/HttpHandler';
import { HttpHandler } from '../server/HttpHandler';
import type { HttpRequest } from '../server/HttpRequest';
import type { HttpResponse } from '../server/HttpResponse';
import type { TemplateHandler } from '../server/util/TemplateHandler';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import { assertError, createErrorMessage } from '../util/errors/ErrorUtil';
import { InternalServerError } from '../util/errors/InternalServerError';
import { trimTrailingSlashes } from '../util/PathUtil';
import type { ProviderFactory } from './configuration/ProviderFactory';
import type { Interaction,
  InteractionHandler,
  InteractionHandlerResult } from './interaction/email-password/handler/InteractionHandler';
import { IdpInteractionError } from './interaction/util/IdpInteractionError';
import type { InteractionCompleter } from './interaction/util/InteractionCompleter';

/**
 * All the information that is required to handle a request to a custom IDP path.
 */
export class InteractionRoute {
  public readonly route: RegExp;
  public readonly handler: InteractionHandler;
  public readonly viewTemplate: string;
  public readonly prompt?: string;
  public readonly responseTemplate?: string;

  /**
   * @param route - Regex to match this route.
   * @param viewTemplate - Template to render on GET requests.
   * @param handler - Handler to call on POST requests.
   * @param prompt - In case of requests to the IDP entry point, the session prompt will be compared to this.
   *                 One entry should have a value of "default" here in case there are no prompt matches.
   * @param responseTemplate - Template to render as a response to POST requests when required.
   */
  public constructor(route: string,
    viewTemplate: string,
    handler: InteractionHandler,
    prompt?: string,
    responseTemplate?: string) {
    this.route = new RegExp(route, 'u');
    this.viewTemplate = viewTemplate;
    this.handler = handler;
    this.prompt = prompt;
    this.responseTemplate = responseTemplate;
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
  private readonly templateHandler: TemplateHandler;
  private readonly interactionCompleter: InteractionCompleter;
  private readonly errorHandler: ErrorHandler;
  private readonly responseWriter: ResponseWriter;

  /**
   * @param baseUrl - Base URL of the server.
   * @param idpPath - Relative path of the IDP entry point.
   * @param requestParser - Used for parsing requests.
   * @param providerFactory - Used to generate the OIDC provider.
   * @param interactionRoutes - All routes handling the custom IDP behaviour.
   * @param templateHandler - Used for rendering responses.
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
    templateHandler: TemplateHandler,
    interactionCompleter: InteractionCompleter,
    errorHandler: ErrorHandler,
    responseWriter: ResponseWriter,
  ) {
    super();
    // Trimming trailing slashes so the relative URL starts with a slash after slicing this off
    this.baseUrl = trimTrailingSlashes(urljoin(baseUrl, idpPath));
    this.requestParser = requestParser;
    this.providerFactory = providerFactory;
    this.interactionRoutes = interactionRoutes;
    this.templateHandler = templateHandler;
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
      // Make sure the request stream still works in case the RequestParser read it
      const provider = await this.providerFactory.getProvider();
      this.logger.debug(`Sending request to oidc-provider: ${request.url}`);
      return provider.callback(request, response);
    }

    const { result, templateFile } = await this.resolveRoute(operation, route, oidcInteraction);
    if (result.type === 'complete') {
      if (!oidcInteraction) {
        // Once https://github.com/solid/community-server/pull/898 is merged
        // we want to assign an error code here to have a more thorough explanation
        throw new BadRequestHttpError(
          'This action can only be executed as part of an authentication flow. It should not be used directly.',
        );
      }
      // We need the original request object for the OIDC library
      const location = await this.interactionCompleter.handleSafe({ ...result.details, request });
      return await this.responseWriter.handleSafe({ response, result: new RedirectResponseDescription(location) });
    }
    if (result.type === 'response' && templateFile) {
      return await this.handleTemplateResponse(response, templateFile, result.details, oidcInteraction);
    }

    throw new BadRequestHttpError(`Unsupported request: ${operation.method} ${operation.target.path}`);
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
   * GET requests go to the templateHandler, POST requests to the specific InteractionHandler of the route.
   */
  private async resolveRoute(operation: Operation, route: InteractionRoute, oidcInteraction?: Interaction):
  Promise<{ result: InteractionHandlerResult; templateFile?: string }> {
    if (operation.method === 'GET') {
      // .ejs templates errors on undefined variables
      return {
        result: { type: 'response', details: { errorMessage: '', prefilled: {}}},
        templateFile: route.viewTemplate,
      };
    }

    if (operation.method === 'POST') {
      try {
        const result = await route.handler.handleSafe({ operation, oidcInteraction });
        return { result, templateFile: route.responseTemplate };
      } catch (error: unknown) {
        // Render error in the view
        const prefilled = IdpInteractionError.isInstance(error) ? error.prefilled : {};
        const errorMessage = createErrorMessage(error);
        return {
          result: { type: 'response', details: { errorMessage, prefilled }},
          templateFile: route.viewTemplate,
        };
      }
    }

    throw new BadRequestHttpError(`Unsupported request: ${operation.method} ${operation.target.path}`);
  }

  private async handleTemplateResponse(response: HttpResponse, templateFile: string, data?: NodeJS.Dict<any>,
    oidcInteraction?: Interaction): Promise<void> {
    const contents = data ?? {};
    contents.authenticating = Boolean(oidcInteraction);
    await this.templateHandler.handleSafe({ response, templateFile, contents });
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
