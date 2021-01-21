import type { Adapter } from 'oidc-provider';

export abstract class StorageAdapterFacotry {
  abstract createStorageAdapter(name: string): Adapter;
}
