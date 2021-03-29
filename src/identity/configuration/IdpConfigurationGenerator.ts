import type { Configuration } from 'oidc-provider';

/**
 * Creates an IdP Configuration to be used in
 * panva/node-oidc-provider
 */
export interface IdpConfigurationGenerator {
  createConfiguration: () => Promise<Configuration>;
}
