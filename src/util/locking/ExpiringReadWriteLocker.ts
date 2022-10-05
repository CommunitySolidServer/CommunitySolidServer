import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { PromiseOrValue } from '../PromiseUtil';
import type { ReadWriteLocker } from './ReadWriteLocker';

/**
 * A {@link ReadWriteLocker} where the locks expire after a given time.
 */
export interface ExpiringReadWriteLocker extends ReadWriteLocker {
  /**
   * As {@link ReadWriteLocker.withReadLock} but the locked function gets called with a `maintainLock` callback function
   * to reset the lock expiration every time it is called.
   * The resulting promise will reject once the lock expires.
   *
   * @param identifier - Identifier of the resource that needs to be locked.
   * @param whileLocked - A function to execute while the resource is locked.
   * Receives a callback as input parameter to maintain the lock.
   */
  withReadLock: <T>(identifier: ResourceIdentifier, whileLocked: (maintainLock: () => void) => PromiseOrValue<T>)
  => Promise<T>;

  /**
   * As {@link ReadWriteLocker.withWriteLock} but the locked function gets called with a `maintainLock`
   * callback function to reset the lock expiration every time it is called.
   * The resulting promise will reject once the lock expires.
   *
   * @param identifier - Identifier of the resource that needs to be locked.
   * @param whileLocked - A function to execute while the resource is locked.
   * Receives a callback as input parameter to maintain the lock.
   */
  withWriteLock: <T>(identifier: ResourceIdentifier, whileLocked: (maintainLock: () => void) => PromiseOrValue<T>)
  => Promise<T>;
}
