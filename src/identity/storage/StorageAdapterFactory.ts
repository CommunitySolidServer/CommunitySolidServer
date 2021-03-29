import type { Adapter } from 'oidc-provider';

/**
 * A factory that generates a StorageAdapter to be used
 * by the IdP to persist information.
 */
export interface StorageAdapterFactory {
  createStorageAdapter: (name: string) => Adapter;
}
