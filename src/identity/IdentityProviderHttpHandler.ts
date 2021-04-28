import type { Provider } from 'oidc-provider';
import type { ResponseWriter } from '../ldp/http/ResponseWriter';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpHandlerInput } from '../server/HttpHandler';
import { HttpHandler } from '../server/HttpHandler';
import { isNativeError } from '../util/errors/ErrorUtil';
import type { IdentityProviderFactory } from './IdentityProviderFactory';
import type { InteractionHttpHandler } from './interaction/InteractionHttpHandler';
import type { InteractionPolicy } from './interaction/InteractionPolicy';

/**
 * Handles requests incoming the IdP and instantiates the IdP to
 * be passed to all child IdpInteractionHttpHandlers
 */
export class IdentityProviderHttpHandler extends HttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly providerFactory: IdentityProviderFactory;
  private readonly interactionPolicy: InteractionPolicy;
  private readonly interactionHttpHandler: InteractionHttpHandler;
  private readonly errorResponseWriter: ResponseWriter;
  private provider?: Provider;

  public constructor(
    providerFactory: IdentityProviderFactory,
    interactionPolicy: InteractionPolicy,
    interactionHttpHandler: InteractionHttpHandler,
    errorResponseWriter: ResponseWriter,
  ) {
    super();
    this.providerFactory = providerFactory;
    this.interactionPolicy = interactionPolicy;
    this.interactionHttpHandler = interactionHttpHandler;
    this.errorResponseWriter = errorResponseWriter;
  }

  /**
   * Create the provider or retrieve it if it has already been created
   */
  private async getGuaranteedProvider(): Promise<Provider> {
    if (!this.provider) {
      try {
        this.provider = await this.providerFactory.createProvider(this.interactionPolicy);
      } catch (err: unknown) {
        this.logger.error(`Failed to create Provider: ${isNativeError(err) ? err.message : 'Unknown error'}`);
        throw err;
      }
    }
    return this.provider;
  }

  /**
   * No canHandle method is provided because this should always accept.
   * A RouterHandler should be placed above this class to restrict the routes it can use.
   */

  public async handle(input: HttpHandlerInput): Promise<void> {
    const provider = await this.getGuaranteedProvider();

    try {
      await this.interactionHttpHandler.canHandle({ ...input, provider });
    } catch {
      this.logger.debug(`Sending request to oidc-provider: ${input.request.url}`);
      // Let the Provider handle the request in case our server has no matching handlers
      return provider.callback(input.request, input.response);
    }

    try {
      await this.interactionHttpHandler.handle({ ...input, provider });
    } catch (error: unknown) {
      if (!isNativeError(error)) {
        throw error;
      }
      await this.errorResponseWriter.handleSafe({ response: input.response, result: error });
    }
  }
}
