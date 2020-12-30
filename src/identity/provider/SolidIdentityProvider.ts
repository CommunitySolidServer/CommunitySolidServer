import type { AnyObject, CanBePromise, Configuration } from 'oidc-provider';
import { Provider } from 'oidc-provider';
// This import probably looks very hacky and it is. Weak Cache is required to get the oidc
// configuration, which, in turn, is needed to get the routes the provider is using.
// It is probably very difficult to get the configuration because Panva does not want
// it to be possible, but we must get the configuration to satisfy the needs of the CSS
// architecture. See the "asyncCallback" method for an explantaion
// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error, @typescript-eslint/ban-ts-comment
// @ts-ignore
import instance from 'oidc-provider/lib/helpers/weak_cache';
import type { HttpHandlerInput } from '../../server/HttpHandler';
import type { AsyncHandler } from '../../util/AsyncHandler';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';

export class SolidIdentityProvider extends Provider implements AsyncHandler<HttpHandlerInput> {
  public constructor(issuer: string, configuration: Configuration) {
    const augmentedConfiguration: Configuration = {
      ...configuration,
      claims: {
        ...configuration.claims,
        webid: [ 'webid', 'client_webid' ],
      },
      conformIdTokenClaims: false,
      features: {
        ...configuration.features,
        registration: { enabled: true },
        dPoP: { enabled: true },
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
    super(issuer, augmentedConfiguration);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async canHandle(input: HttpHandlerInput): Promise<void> {
    // Get the routes from the configuration. `instance` is needed because the configuration
    // is not actually stored in the provider object, but rather in a WeakMap accessed by
    // the provider instance.
    // https://github.com/panva/node-oidc-provider/blob/master/lib/provider.js#L88-L91
    const validRoutes: string[] = Object.values(instance(this).configuration().routes);
    validRoutes.push('/.well-known/openid-configuration');
    // If the IdP can't handle a request this function must be escaped before calling
    // `super.callback`. If `super.callback` is called, a response will be sent no matter
    // what (That's just how Koa works).
    if (!validRoutes.some((route): boolean => input.request.url === route)) {
      throw new NotFoundHttpError(`Identity Provider cannot handle ${input.request.url}`);
    }
  }

  /**
   * Handles the given input. This should only be done if the {@link canHandle} function returned `true`.
   * @param input - Input data that needs to be handled.
   *
   * @returns A promise resolving when the handling is finished. Return value depends on the given type.
   */
  public async handle(input: HttpHandlerInput): Promise<void> {
    return super.callback(input.request, input.response) as unknown as Promise<void>;
  }

  public async handleSafe(data: HttpHandlerInput): Promise<void> {
    await this.canHandle(data);

    return this.handle(data);
  }
}
