import type { Adapter } from 'oidc-provider';

/**
 * A factory that generates a StorageAdapter to be used
 * by the IDP to persist information.
 */
export interface AdapterFactory {
  createStorageAdapter: (name: string) => Adapter;
}
