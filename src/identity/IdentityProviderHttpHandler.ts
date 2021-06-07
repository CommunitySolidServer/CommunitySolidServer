import type { Provider } from 'oidc-provider';
import type { ErrorHandler } from '../ldp/http/ErrorHandler';
import type { ResponseWriter } from '../ldp/http/ResponseWriter';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpHandlerInput } from '../server/HttpHandler';
import { HttpHandler } from '../server/HttpHandler';
import { assertError, createErrorMessage } from '../util/errors/ErrorUtil';
import type { IdentityProviderFactory } from './IdentityProviderFactory';
import type { InteractionHttpHandler } from './interaction/InteractionHttpHandler';
import type { InteractionPolicy } from './interaction/InteractionPolicy';

/**
 * Handles all requests relevant for the entire IDP interaction,
 * by sending them to either the stored {@link InteractionHttpHandler},
 * or the generated {@link Provider} if the first does not support the request.
 *
 * The InteractionHttpHandler would handle all requests where we need custom behaviour,
 * such as everything related to generating and validating an account.
 * The Provider handles all the default request such as the initial handshake.
 *
 * This handler handles all requests since it assumes all those requests are relevant for the IDP interaction.
 * A {@link RouterHandler} should be used to filter out other requests.
 */
export class IdentityProviderHttpHandler extends HttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly providerFactory: IdentityProviderFactory;
  private readonly interactionPolicy: InteractionPolicy;
  private readonly interactionHttpHandler: InteractionHttpHandler;
  private readonly errorHandler: ErrorHandler;
  private readonly responseWriter: ResponseWriter;
  private provider?: Provider;

  public constructor(
    providerFactory: IdentityProviderFactory,
    interactionPolicy: InteractionPolicy,
    interactionHttpHandler: InteractionHttpHandler,
    errorHandler: ErrorHandler,
    responseWriter: ResponseWriter,
  ) {
    super();
    this.providerFactory = providerFactory;
    this.interactionPolicy = interactionPolicy;
    this.interactionHttpHandler = interactionHttpHandler;
    this.errorHandler = errorHandler;
    this.responseWriter = responseWriter;
  }

  /**
   * Create the provider or retrieve it if it has already been created.
   */
  private async getProvider(): Promise<Provider> {
    if (!this.provider) {
      try {
        this.provider = await this.providerFactory.createProvider(this.interactionPolicy);
      } catch (err: unknown) {
        this.logger.error(`Failed to create Provider: ${createErrorMessage(err)}`);
        throw err;
      }
    }
    return this.provider;
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    const provider = await this.getProvider();

    try {
      await this.interactionHttpHandler.canHandle({ ...input, provider });
    } catch {
      this.logger.debug(`Sending request to oidc-provider: ${input.request.url}`);
      return provider.callback(input.request, input.response);
    }

    try {
      await this.interactionHttpHandler.handle({ ...input, provider });
    } catch (error: unknown) {
      assertError(error);
      const preferences: RepresentationPreferences = { type: { 'text/plain': 1 }};
      const result = await this.errorHandler.handleSafe({ error, preferences });
      await this.responseWriter.handleSafe({ response: input.response, result });
    }
  }
}
