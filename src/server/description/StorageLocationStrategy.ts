import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';

/**
 * Interface used to find the storage a specific identifier is located in.
 */
export interface StorageLocationStrategy {
  /**
   * Returns the identifier of the storage that contains the given resource.
   * Can error if the input identifier is not part of any storage.
   */
  getStorageIdentifier: (identifier: ResourceIdentifier) => Promise<ResourceIdentifier>;
}
