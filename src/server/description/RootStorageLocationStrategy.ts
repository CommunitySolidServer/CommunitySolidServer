import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { StorageLocationStrategy } from './StorageLocationStrategy';

/**
 * A {@link StorageLocationStrategy} to be used when the server has one storage in the root container of the server.
 */
export class RootStorageLocationStrategy implements StorageLocationStrategy {
  private readonly root: ResourceIdentifier;

  public constructor(baseUrl: string) {
    this.root = { path: baseUrl };
  }

  public async getStorageIdentifier(): Promise<ResourceIdentifier> {
    return this.root;
  }
}
