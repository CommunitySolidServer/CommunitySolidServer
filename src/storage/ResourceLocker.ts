import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import type { Lock } from './Lock';

/**
 * Allows the locking of resources which is needed for non-atomic {@link ResourceStore}s.
 */
export interface ResourceLocker<T extends Lock = Lock> {
  /**
   * Lock the given resource.
   * @param identifier - Identifier of the resource that needs to be locked.
   *
   * @returns A promise containing the lock on the resource.
   */
  acquire: (identifier: ResourceIdentifier) => Promise<T>;
}
