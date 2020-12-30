import type { IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import type { AnyObject, CanBePromise, Configuration } from 'oidc-provider';
// This import probably looks very hacky and it is. Weak Cache is required to get the oidc
// configuration, which, in turn, is needed to get the routes the provider is using.
// It is probably very difficult to get the configuration because Panva does not want
// it to be possible, but we must get the configuration to satisfy the needs of the CSS
// architecture. See the "asyncCallback" method for an explantaion
// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error, @typescript-eslint/ban-ts-comment
// @ts-ignore
import instance from 'oidc-provider/lib/helpers/weak_cache';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { OidcProvider } from './OidcProvider';

export class SolidOidcProvider extends OidcProvider {
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

  /**
   * Handles a request. Returns a promise that will either resolve if a response is
   * given (including if the response is an error page) and throw an error if the
   * idp cannot handle the request.
   * NOTE: This method has a lot of hacks in it to get it to work with node-oidc-provider.
   */
  public async asyncCallback(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    // Get the routes from the configuration. `instance` is needed because the configuration
    // is not actually stored in the provider object, but rather in a WeakMap accessed by
    // the provider instance.
    // https://github.com/panva/node-oidc-provider/blob/master/lib/provider.js#L88-L91
    const validRoutes: string[] = Object.values(
      instance(this).configuration().routes,
    );
    validRoutes.push('/.well-known/openid-configuration');
    // If the IdP can't handle a request this function must be escaped before calling
    // `super.callback`. If `super.callback` is called, a response will be sent no matter
    // what (That's just how Koa works).
    if (!req.url) {
      throw new InternalServerError('No Request URL');
    }
    const pathname = parse(req.url, true).pathname ?? '';
    if (!validRoutes.some((route): boolean => route === pathname)) {
      throw new NotFoundHttpError(`Identity Provider cannot handle ${req.url}`);
    }
    // This casting might seem strange, but "callback" is a Koa callback which does
    // actually return a Promise, despite what the typings say.
    // https://github.com/koajs/koa/blob/b4398f5d68f9546167419f394a686afdcb5e10e2/lib/application.js#L168
    return (super.callback(req, res) as unknown) as Promise<void>;
  }
}
