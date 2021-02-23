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
  private provider: Provider | undefined;
  private providerCreationPromise: Promise<Provider> | undefined;
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
      if (!this.providerCreationPromise) {
        this.providerCreationPromise = this.providerFactory.createProvider(this.interactionPolicyHttpHandler);
      }
      try {
        this.provider = await this.providerCreationPromise;
      } catch (err: unknown) {
        this.logger.error(err as string);
        throw err;
      }
    }
    return this.provider;
  }

  /**
   * No canhandle method is provided because this should always accept.
   * A routerhandler should be placed above this class to restrict the routes it can use.
   */

  /**
   * Handles the given input. This should only be done if the {@link canHandle} function returned `true`.
   * @param input - Input data that needs to be handled.
   *
   * @returns A promise resolving when the handling is finished. Return value depends on the given type.
   */
  public async handle(input: HttpHandlerInput): Promise<void> {
    const provider = await this.getGuaranteedProvider();

    try {
      await this.interactionPolicyHttpHandler.canHandle({ ...input, provider });
    } catch {
      // This casting might seem strange, but "callback" is a Koa callback which does
      // actually return a Promise, despite what the typings say.
      // https://github.com/koajs/koa/blob/b4398f5d68f9546167419f394a686afdcb5e10e2/lib/application.js#L168
      return provider.callback(
        input.request,
        input.response,
      ) as unknown as Promise<void>;
    }
    return this.interactionPolicyHttpHandler.handle({ ...input, provider });
  }
}
