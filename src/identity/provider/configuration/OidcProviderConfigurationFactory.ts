import type { Configuration } from 'oidc-provider';

export abstract class OidcProviderConfigurationFactory {
  abstract createConfiguration(): Promise<Configuration>;
}
