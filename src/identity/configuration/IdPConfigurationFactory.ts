import type { IdPConfiguration } from './IdPConfiguration';

export abstract class IdPConfigurationFactory {
  abstract createConfiguration(): IdPConfiguration;
}
