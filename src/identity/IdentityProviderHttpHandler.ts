import type { ErrorHandler } from '../ldp/http/ErrorHandler';
import type { ResponseWriter } from '../ldp/http/ResponseWriter';
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
import type { InteractionHandler,
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

  private readonly idpPath: string;
  private readonly providerFactory: ProviderFactory;
  private readonly interactionRoutes: InteractionRoute[];
  private readonly templateHandler: TemplateHandler;
  private readonly interactionCompleter: InteractionCompleter;
  private readonly errorHandler: ErrorHandler;
  private readonly responseWriter: ResponseWriter;

  /**
   * @param idpPath - Relative path of the IDP entry point.
   * @param providerFactory - Used to generate the OIDC provider.
   * @param interactionRoutes - All routes handling the custom IDP behaviour.
   * @param templateHandler - Used for rendering responses.
   * @param interactionCompleter - Used for POST requests that need to be handled by the OIDC library.
   * @param errorHandler - Converts errors to responses.
   * @param responseWriter - Renders error responses.
   */
  public constructor(
    idpPath: string,
    providerFactory: ProviderFactory,
    interactionRoutes: InteractionRoute[],
    templateHandler: TemplateHandler,
    interactionCompleter: InteractionCompleter,
    errorHandler: ErrorHandler,
    responseWriter: ResponseWriter,
  ) {
    super();
    if (!idpPath.startsWith('/')) {
      throw new Error('idpPath needs to start with a /');
    }
    // Trimming trailing slashes so the relative URL starts with a slash after slicing this off
    this.idpPath = trimTrailingSlashes(idpPath);
    this.providerFactory = providerFactory;
    this.interactionRoutes = interactionRoutes;
    this.templateHandler = templateHandler;
    this.interactionCompleter = interactionCompleter;
    this.errorHandler = errorHandler;
    this.responseWriter = responseWriter;
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    try {
      await this.handleRequest(request, response);
    } catch (error: unknown) {
      assertError(error);
      // Setting preferences to text/plain since we didn't parse accept headers, see #764
      const result = await this.errorHandler.handleSafe({ error, preferences: { type: { 'text/plain': 1 }}});
      await this.responseWriter.handleSafe({ response, result });
    }
  }

  /**
   * Finds the matching route and resolves the request.
   */
  private async handleRequest(request: HttpRequest, response: HttpResponse): Promise<void> {
    // If our own interaction handler does not support the input, it is either invalid or a request for the OIDC library
    const route = await this.findRoute(request, response);
    if (!route) {
      const provider = await this.providerFactory.getProvider();
      this.logger.debug(`Sending request to oidc-provider: ${request.url}`);
      return provider.callback(request, response);
    }

    await this.resolveRoute(request, response, route);
  }

  /**
   * Finds a route that supports the given request.
   */
  private async findRoute(request: HttpRequest, response: HttpResponse): Promise<InteractionRoute | undefined> {
    if (!request.url || !request.url.startsWith(this.idpPath)) {
      // This is either an invalid request or a call to the .well-known configuration
      return;
    }
    const url = request.url.slice(this.idpPath.length);
    let route = this.getRouteMatch(url);

    // In case the request targets the IDP entry point the prompt determines where to go
    if (!route && (url === '/' || url === '')) {
      const provider = await this.providerFactory.getProvider();
      const interactionDetails = await provider.interactionDetails(request, response);
      route = this.getPromptMatch(interactionDetails.prompt.name);
    }
    return route;
  }

  /**
   * Handles the behaviour of an InteractionRoute.
   * Will error if the route does not support the given request.
   *
   * GET requests go to the templateHandler, POST requests to the specific InteractionHandler of the route.
   */
  private async resolveRoute(request: HttpRequest, response: HttpResponse, route: InteractionRoute): Promise<void> {
    if (request.method === 'GET') {
      // .ejs templates errors on undefined variables
      return await this.handleTemplateResponse(response, route.viewTemplate, { errorMessage: '', prefilled: {}});
    }

    if (request.method === 'POST') {
      let result: InteractionHandlerResult;
      try {
        result = await route.handler.handleSafe({ request, response });
      } catch (error: unknown) {
        // Render error in the view
        const prefilled = IdpInteractionError.isInstance(error) ? error.prefilled : {};
        const errorMessage = createErrorMessage(error);
        return await this.handleTemplateResponse(response, route.viewTemplate, { errorMessage, prefilled });
      }

      if (result.type === 'complete') {
        return await this.interactionCompleter.handleSafe({ ...result.details, request, response });
      }
      if (result.type === 'response' && route.responseTemplate) {
        return await this.handleTemplateResponse(response, route.responseTemplate, result.details);
      }
    }
    throw new BadRequestHttpError(`Unsupported request: ${request.method} ${request.url}`);
  }

  private async handleTemplateResponse(response: HttpResponse, templateFile: string, contents?: NodeJS.Dict<any>):
  Promise<void> {
    await this.templateHandler.handleSafe({ response, templateFile, contents: contents ?? {}});
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
