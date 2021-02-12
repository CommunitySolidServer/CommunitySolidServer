import type { Adapter } from 'oidc-provider';

export abstract class StorageAdapterFactory {
  abstract createStorageAdapter(name: string): Adapter;
}
