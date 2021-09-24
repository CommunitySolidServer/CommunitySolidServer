import type { ErrorHandler } from '../ldp/http/ErrorHandler';
import { RedirectResponseDescription } from '../ldp/http/response/RedirectResponseDescription';
import { ResponseDescription } from '../ldp/http/response/ResponseDescription';
import type { Operation } from '../ldp/operations/Operation';
import { BasicRepresentation } from '../ldp/representation/BasicRepresentation';
import type { Representation } from '../ldp/representation/Representation';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpRequest } from '../server/HttpRequest';
import type { OperationHttpHandlerInput } from '../server/OperationHttpHandler';
import { OperationHttpHandler } from '../server/OperationHttpHandler';
import type { RepresentationConverter } from '../storage/conversion/RepresentationConverter';
import { APPLICATION_JSON } from '../util/ContentTypes';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import { joinUrl, trimTrailingSlashes } from '../util/PathUtil';
import { addTemplateMetadata, cloneRepresentation } from '../util/ResourceUtil';
import { readJsonStream } from '../util/StreamUtil';
import type { ProviderFactory } from './configuration/ProviderFactory';
import type { Interaction } from './interaction/email-password/handler/InteractionHandler';
import type { InteractionRoute, TemplatedInteractionResult } from './interaction/routing/InteractionRoute';
import type { InteractionCompleter } from './interaction/util/InteractionCompleter';

// Registration is not standardized within Solid yet, so we use a custom versioned API for now
const API_VERSION = '0.2';

export interface IdentityProviderHttpHandlerArgs {
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
  /**
   * Used for converting output errors.
   */
  errorHandler: ErrorHandler;
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
export class IdentityProviderHttpHandler extends OperationHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly baseUrl: string;
  private readonly providerFactory: ProviderFactory;
  private readonly interactionRoutes: InteractionRoute[];
  private readonly converter: RepresentationConverter;
  private readonly interactionCompleter: InteractionCompleter;
  private readonly errorHandler: ErrorHandler;

  private readonly controls: Record<string, string>;

  public constructor(args: IdentityProviderHttpHandlerArgs) {
    // It is important that the RequestParser does not read out the Request body stream.
    // Otherwise we can't pass it anymore to the OIDC library when needed.
    super();
    // Trimming trailing slashes so the relative URL starts with a slash after slicing this off
    this.baseUrl = trimTrailingSlashes(joinUrl(args.baseUrl, args.idpPath));
    this.providerFactory = args.providerFactory;
    this.interactionRoutes = args.interactionRoutes;
    this.converter = args.converter;
    this.interactionCompleter = args.interactionCompleter;
    this.errorHandler = args.errorHandler;

    this.controls = Object.assign(
      {},
      ...this.interactionRoutes.map((route): Record<string, string> => this.getRouteControls(route)),
    );
  }

  /**
   * Finds the matching route and resolves the operation.
   */
  public async handle({ operation, request, response }: OperationHttpHandlerInput):
  Promise<ResponseDescription | undefined> {
    // This being defined means we're in an OIDC session
    let oidcInteraction: Interaction | undefined;
    try {
      const provider = await this.providerFactory.getProvider();
      // This being defined means we're in an OIDC session
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

    // Cloning input data so it can be sent back in case of errors
    let clone: Representation | undefined;

    // IDP handlers expect JSON data
    if (operation.body) {
      const args = {
        representation: operation.body,
        preferences: { type: { [APPLICATION_JSON]: 1 }},
        identifier: operation.target,
      };
      operation.body = await this.converter.handleSafe(args);
      clone = await cloneRepresentation(operation.body);
    }

    const result = await route.handleOperation(operation, oidcInteraction);

    // Reset the body so it can be reused when needed for output
    operation.body = clone;

    return this.handleInteractionResult(operation, request, result, oidcInteraction);
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

    for (const route of this.interactionRoutes) {
      if (route.supportsPath(pathName, oidcInteraction?.prompt.name)) {
        return route;
      }
    }
  }

  /**
   * Creates a ResponseDescription based on the InteractionHandlerResult.
   * This will either be a redirect if type is "complete" or a data stream if the type is "response".
   */
  private async handleInteractionResult(operation: Operation, request: HttpRequest,
    result: TemplatedInteractionResult, oidcInteraction?: Interaction): Promise<ResponseDescription> {
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
    } else if (result.type === 'error') {
      // We want to show the errors on the original page in case of html interactions, so we can't just throw them here
      const preferences = { type: { [APPLICATION_JSON]: 1 }};
      const response = await this.errorHandler.handleSafe({ error: result.error, preferences });
      const details = await readJsonStream(response.data!);

      // Add the input data to the JSON response;
      if (operation.body) {
        details.prefilled = await readJsonStream(operation.body.data);

        // Don't send passwords back
        delete details.prefilled.password;
        delete details.prefilled.confirmPassword;
      }

      responseDescription =
        await this.handleResponseResult(details, operation, result.templateFiles, oidcInteraction, response.statusCode);
    } else {
      // Convert the response object to a data stream
      responseDescription =
        await this.handleResponseResult(result.details ?? {}, operation, result.templateFiles, oidcInteraction);
    }

    return responseDescription;
  }

  /**
   * Converts an InteractionResponseResult to a ResponseDescription by first converting to a Representation
   * and applying necessary conversions.
   */
  private async handleResponseResult(details: Record<string, any>, operation: Operation,
    templateFiles: Record<string, string>, oidcInteraction?: Interaction, statusCode = 200):
    Promise<ResponseDescription> {
    const json = {
      ...details,
      apiVersion: API_VERSION,
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

    return new ResponseDescription(statusCode, converted.metadata, converted.data);
  }

  /**
   * Converts the controls object of a route to one with full URLs.
   */
  private getRouteControls(route: InteractionRoute): Record<string, string> {
    const entries = Object.entries(route.getControls())
      .map(([ name, path ]): [ string, string ] => [ name, joinUrl(this.baseUrl, path) ]);
    return Object.fromEntries(entries);
  }
}
