import type { AnyObject,
  CanBePromise,
  interactionPolicy as InteractionPolicy,
  KoaContextWithOIDC,
  Configuration,
  Account,
  ErrorOut } from 'oidc-provider';
import { Provider } from 'oidc-provider';
import type { ErrorHandler } from '../ldp/http/ErrorHandler';
import type { ResponseWriter } from '../ldp/http/ResponseWriter';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import type { ConfigurationFactory } from './configuration/ConfigurationFactory';

/**
 * Creates a Provider from the oidc-provider library.
 * This can be used for handling many of the oidc interactions during the IDP process.
 * Full documentation can be found at https://github.com/panva/node-oidc-provider/blob/v6.x/docs/README.md
 */
export class IdentityProviderFactory {
  private readonly issuer: string;
  private readonly configurationFactory: ConfigurationFactory;
  private readonly errorHandler: ErrorHandler;
  private readonly responseWriter: ResponseWriter;

  public constructor(issuer: string, configurationFactory: ConfigurationFactory,
    errorHandler: ErrorHandler, responseWriter: ResponseWriter) {
    this.issuer = issuer;
    this.configurationFactory = configurationFactory;
    this.errorHandler = errorHandler;
    this.responseWriter = responseWriter;
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
      extraAccessTokenClaims(ctx, token): CanBePromise<AnyObject | void | undefined> {
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
      renderError:
        async(ctx: KoaContextWithOIDC, out: ErrorOut, error: Error): Promise<void> => {
          const preferences: RepresentationPreferences = { type: { 'text/plain': 1 }};
          const result = await this.errorHandler.handleSafe({ error, preferences });
          await this.responseWriter.handleSafe({ response: ctx.res, result });
        },
    };
    return new Provider(this.issuer, augmentedConfig);
  }
}
