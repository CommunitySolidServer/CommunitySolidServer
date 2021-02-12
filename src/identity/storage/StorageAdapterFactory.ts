import type { Adapter } from 'oidc-provider';

/**
 * A factory that generates a StorageAdapter to be used
 * by the IdP to persist information.
 */
export abstract class StorageAdapterFactory {
  abstract createStorageAdapter(name: string): Adapter;
}
