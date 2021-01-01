import { parse } from 'url';
import type { AnyObject, CanBePromise } from 'oidc-provider';
import { Provider } from 'oidc-provider';
// This import probably looks very hacky and it is. Weak Cache is required to get the oidc
// configuration, which, in turn, is needed to get the routes the provider is using.
// It is probably very difficult to get the configuration because Panva does not want
// it to be possible, but we must get the configuration to satisfy the needs of the CSS
// architecture. See the "asyncCallback" method for an explantaion
// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error, @typescript-eslint/ban-ts-comment
// @ts-ignore
import instance from 'oidc-provider/lib/helpers/weak_cache';
import type { HttpHandler, HttpHandlerInput } from '../server/HttpHandler';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { InteractionHttpHandler } from './InteractionHttpHandler';
import type { ProviderConfiguration } from './ProviderConfiguration';
import type { ProviderConfigurationFactory } from './ProviderConfigurationFactory';

export class SolidIdentityProvider extends Provider implements HttpHandler {
  private readonly interactionHttpHandler: InteractionHttpHandler;

  public constructor(
    issuer: string,
    configurationFactory: ProviderConfigurationFactory,
  ) {
    const configuration = configurationFactory.createConfiguration();
    const augmentedConfig: ProviderConfiguration = {
      ...configuration,
      claims: {
        ...configuration.claims,
        webid: [ 'webid', 'client_webid' ],
      },
      conformIdTokenClaims: false,
      features: {
        ...configuration.features,
        registration: { enabled: true },
        dPoP: { enabled: true, ack: 'draft-01' },
        claimsParameter: { enabled: true },
      },
      subjectTypes: [ 'public', 'pairwise' ],
      extraAccessTokenClaims(
        ctx,
        token,
      ): CanBePromise<AnyObject | void | undefined> {
        if ((token as any).accountId) {
          return {
            webid: (token as any).accountId,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            client_webid: 'http://localhost:3001/',
          };
        }
        return {};
      },
    };
    super(issuer, augmentedConfig);
    this.interactionHttpHandler = configuration.interactions;
  }

  /**
   * Handles a request. Returns a promise that will either resolve if a response is
   * given (including if the response is an error page) and throw an error if the
   * idp cannot handle the request.
   * NOTE: This method has a lot of hacks in it to get it to work with node-oidc-provider.
   */
  public async canHandle(input: HttpHandlerInput): Promise<void> {
    // Get the routes from the configuration. `instance` is needed because the configuration
    // is not actually stored in the provider object, but rather in a WeakMap accessed by
    // the provider instance.
    // https://github.com/panva/node-oidc-provider/blob/master/lib/provider.js#L88-L91
    const validRoutes: string[] = Object.values(
      instance(this).configuration().routes,
    );
    validRoutes.push('/.well-known/openid-configuration');

    // Throw an error if the request URL is not part of the valid routes
    if (!input.request.url || !validRoutes.includes((parse(input.request.url) as any).pathname)) {
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
    // This casting might seem strange, but "callback" is a Koa callback which does
    // actually return a Promise, despite what the typings say.
    // https://github.com/koajs/koa/blob/b4398f5d68f9546167419f394a686afdcb5e10e2/lib/application.js#L168
    try {
      await this.interactionHttpHandler.handleSafe({ ...input, provider: this });
    } catch {
      return super.callback(
        input.request,
        input.response,
      ) as unknown as Promise<void>;
    }
  }

  public async handleSafe(data: HttpHandlerInput): Promise<void> {
    await this.canHandle(data);
    return this.handle(data);
  }
}
