// eslint-disable-next-line ts/ban-ts-comment, ts/prefer-ts-expect-error
// @ts-ignore
import type Provider from 'oidc-provider';

/**
 * Returns a Provider of OIDC interactions.
 */
export interface ProviderFactory {
  /**
   * Gets a provider from the factory.
   * Multiple calls to this function should return providers that produce the same results.
   * This is mostly relevant for signing keys.
   */
  getProvider: () => Promise<Provider>;
}
