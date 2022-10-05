import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { PromiseOrValue } from '../PromiseUtil';

/**
 * Allows the locking of resources which is needed for non-atomic {@link ResourceStore}s.
 */
export interface ReadWriteLocker {
  /**
   * Run the given function while the resource is locked.
   * The lock will be released when the (async) input function resolves.
   * This function should be used for operations that only require reading the resource.
   *
   * @param identifier - Identifier of the resource that needs to be locked.
   * @param whileLocked - A function to execute while the resource is locked.
   *
   * @returns A promise resolving when the lock is released.
   */
  withReadLock: <T>(identifier: ResourceIdentifier, whileLocked: () => PromiseOrValue<T>) => Promise<T>;

  /**
   * Run the given function while the resource is locked.
   * The lock will be released when the (async) input function resolves.
   * This function should be used for operations that could modify the resource.
   *
   * @param identifier - Identifier of the resource that needs to be locked.
   * @param whileLocked - A function to execute while the resource is locked.
   *
   * @returns A promise resolving when the lock is released.
   */
  withWriteLock: <T>(identifier: ResourceIdentifier, whileLocked: () => PromiseOrValue<T>) => Promise<T>;
}
