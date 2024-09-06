import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';

/**
 * An interface for classes that only have 1 way to lock interfaces.
 * In general this should only be used by components implementing the {@link ReadWriteLocker} interface.
 * Other components that require locking of resources should use that interface.
 */
export interface ResourceLocker {
  /**
   * Acquires a lock on the requested identifier.
   * The promise will resolve when the lock has been acquired.
   *
   * @param identifier - Resource to acquire a lock on.
   */
  acquire: (identifier: ResourceIdentifier) => Promise<void>;

  /**
   * Releases a lock on the requested identifier.
   * The promise will resolve when the lock has been released.
   * If there is no lock on the resource, an error should be thrown.
   *
   * @param identifier - Resource to release the lock on.
   */
  release: (identifier: ResourceIdentifier) => Promise<void>;
}
