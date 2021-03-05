import type { Provider } from 'oidc-provider';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpHandlerInput } from '../server/HttpHandler';
import { HttpHandler } from '../server/HttpHandler';
import type { IdentityProviderFactory } from './IdentityProviderFactory';
import type { IdpInteractionPolicyHttpHandler } from './interaction/IdpInteractionPolicyHttpHandler';

/**
 * Handles requests incoming the IdP and instantiates the IdP to
 * be passed to all child IdpInteractionHttpHandlers
 */
export class IdentityProviderHttpHandler extends HttpHandler {
  private readonly providerFactory: IdentityProviderFactory;
  private provider?: Provider;
  private readonly interactionPolicyHttpHandler: IdpInteractionPolicyHttpHandler;
  private readonly logger = getLoggerFor(this);

  public constructor(
    providerFactory: IdentityProviderFactory,
    interactionPolicyHttpHandler: IdpInteractionPolicyHttpHandler,
  ) {
    super();
    this.interactionPolicyHttpHandler = interactionPolicyHttpHandler;
    this.providerFactory = providerFactory;
  }

  /**
   * Create the provider or retrieve it if it has already been created
   */
  private async getGuaranteedProvider(): Promise<Provider> {
    if (!this.provider) {
      try {
        this.provider = await this.providerFactory.createProvider(this.interactionPolicyHttpHandler);
      } catch (err: unknown) {
        this.logger.error(err as string);
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
      await this.interactionPolicyHttpHandler.canHandle({ ...input, provider });
    } catch {
      return provider.callback(
        input.request,
        input.response,
      );
    }
    return this.interactionPolicyHttpHandler.handle({ ...input, provider });
  }
}
