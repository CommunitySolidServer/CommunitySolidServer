import type { OidcProvider } from './OidcProvider';

export abstract class OidcProviderFactory {
  abstract createOidcProvider(): Promise<OidcProvider>;
}
