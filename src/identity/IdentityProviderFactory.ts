import type { AnyObject,
  CanBePromise,
  interactionPolicy as InteractionPolicy,
  KoaContextWithOIDC,
  Configuration,
  Account } from 'oidc-provider';
import { Provider } from 'oidc-provider';

import type { IdpConfigurationGenerator } from './configuration/IdpConfigurationGenerator';

/**
 * Creates an identity provider
 */
export class IdentityProviderFactory {
  private readonly issuer: string;
  private readonly configurationFactory: IdpConfigurationGenerator;

  public constructor(
    issuer: string,
    configurationFactory: IdpConfigurationGenerator,
  ) {
    this.issuer = issuer;
    this.configurationFactory = configurationFactory;
  }

  public async createProvider(interactionPolicyOptions: {
    policy?: InteractionPolicy.Prompt[];
    url?: (ctx: KoaContextWithOIDC) => CanBePromise<string>;
  }): Promise<Provider> {
    const configuration = await this.configurationFactory.createConfiguration();
    const augmentedConfig: Configuration = {
      ...configuration,
      interactions: {
        policy: interactionPolicyOptions.policy,
        url: interactionPolicyOptions.url,
      },
      async findAccount(ctx: KoaContextWithOIDC, sub: string): Promise<Account> {
        return {
          accountId: sub,
          async claims(): Promise<{ sub: string; [key: string]: any }> {
            return {
              sub,
              webid: sub,
            };
          },
        };
      },
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
      formats: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        AccessToken: 'jwt',
      },
      audiences(): string {
        return 'solid';
      },
      extraAccessTokenClaims(
        ctx,
        token,
      ): CanBePromise<AnyObject | void | undefined> {
        if ((token as any).accountId) {
          return {
            webid: (token as any).accountId,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            client_webid: 'http://localhost:3001/',
            aud: 'solid',
          };
        }
        return {};
      },
    };
    return new Provider(this.issuer, augmentedConfig);
  }
}
