import type { Configuration } from 'oidc-provider';

export abstract class IdPConfigurationFactory {
  abstract createConfiguration(): Configuration;
}
