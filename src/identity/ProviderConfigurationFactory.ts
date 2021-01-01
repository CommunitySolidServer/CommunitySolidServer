import type { ProviderConfiguration } from './ProviderConfiguration';

export abstract class ProviderConfigurationFactory {
  abstract createConfiguration(): ProviderConfiguration;
}
