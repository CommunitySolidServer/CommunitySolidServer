import type { Provider } from 'oidc-provider';

export abstract class OidcProviderFactory {
  abstract createOidcProvider(): Promise<Provider>;
}
