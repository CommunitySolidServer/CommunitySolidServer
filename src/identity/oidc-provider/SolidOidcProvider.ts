import type { AnyObject, CanBePromise, Configuration } from 'oidc-provider';
import { Provider } from 'oidc-provider';

export class SolidOidcProvider extends Provider {
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
      extraAccessTokenClaims(ctx, token): CanBePromise<AnyObject | void | undefined> {
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
}
