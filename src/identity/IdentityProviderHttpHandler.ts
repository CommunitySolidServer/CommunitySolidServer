import { parse } from 'url';
import type { Provider } from 'oidc-provider';
// This import probably looks very hacky and it is. Weak Cache is required to get the oidc
// configuration, which, in turn, is needed to get the routes the provider is using.
// It is probably very difficult to get the configuration because Panva does not want
// it to be possible, but we must get the configuration to satisfy the needs of the CSS
// architecture. See the "canHandle" method for an explantaion
// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error, @typescript-eslint/ban-ts-comment
// @ts-ignore
import instance from 'oidc-provider/lib/helpers/weak_cache';
import type { HttpHandlerInput } from '../server/HttpHandler';
import { HttpHandler } from '../server/HttpHandler';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { IdentityProviderFactory } from './IdentityProviderFactory';
import type { IdPInteractionPolicyHttpHandler } from './interaction/IdPInteractionPolicyHttpHandler';

export class IdentityProviderHttpHandler extends HttpHandler {
  private readonly providerFactory: IdentityProviderFactory;
  private provider: Provider | undefined;
  private providerCreationPromise: Promise<Provider> | undefined;
  private readonly interactionPolicyHttpHandler: IdPInteractionPolicyHttpHandler;

  public constructor(
    providerFactory: IdentityProviderFactory,
    interactionPolicyHttpHandler: IdPInteractionPolicyHttpHandler,
  ) {
    super();
    this.interactionPolicyHttpHandler = interactionPolicyHttpHandler;
    this.providerFactory = providerFactory;
    // Providers must be generated asynchronously, but you can't await
    // promises in the constructor.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.getGuaranteedProvider();
  }

  /**
   * Create the provider or retrieve it if it has already been created
   */
  private async getGuaranteedProvider(): Promise<Provider> {
    if (!this.provider) {
      if (!this.providerCreationPromise) {
        this.providerCreationPromise = this.providerFactory.createProvider(this.interactionPolicyHttpHandler);
      }
      this.provider = await this.providerCreationPromise;
    }
    return this.provider;
  }

  /**
   * Handles a request. Returns a promise that will either resolve if a response is
   * given (including if the response is an error page) and throw an error if the
   * idp cannot handle the request.
   * NOTE: This method has a lot of hacks in it to get it to work with node-oidc-provider.
   */
  public async canHandle(input: HttpHandlerInput): Promise<void> {
    const provider = await this.getGuaranteedProvider();

    // Get the routes from the configuration. `instance` is needed because the configuration
    // is not actually stored in the provider object, but rather in a WeakMap accessed by
    // the provider instance.
    // https://github.com/panva/node-oidc-provider/blob/master/lib/provider.js#L88-L91
    const routesMap: Record<string, string> = instance(provider).configuration().routes;
    const validRoutes: string[] = Object.values(routesMap);
    validRoutes.push('/.well-known/openid-configuration');
    // URL.parse is deprecated, but as of the time this comment was written, there
    // doesn't seem to be a perfect replacement for it, so we will keep it until there
    // is a perfect replacement
    // https://github.com/nodejs/node/issues/12682#issuecomment-736510378
    const url = input.request.url ? parse(input.request.url).pathname as string : '';

    let interactionHttpHandlerCanHandle = true;
    try {
      await this.interactionPolicyHttpHandler.canHandle({ ...input, provider });
    } catch {
      interactionHttpHandlerCanHandle = false;
    }

    // Account for special case where the interaction policy calls back to "/auth/:uid"
    const isSpecialCallbackRoute =
      new RegExp(
        `^${routesMap.authorization}/[_A-Za-z0-9\\-]+/?$`,
        'u',
      ).test(url);

    // Throw an error if the request URL is not part of the valid routes
    if (!isSpecialCallbackRoute && !validRoutes.includes(url) && !interactionHttpHandlerCanHandle) {
      throw new NotImplementedHttpError(`Solid Identity Provider cannot handle request URL ${input.request.url}`);
    }
  }

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
