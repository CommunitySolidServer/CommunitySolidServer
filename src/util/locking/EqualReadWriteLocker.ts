import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { PromiseOrValue } from '../PromiseUtil';
import type { ReadWriteLocker } from './ReadWriteLocker';
import type { ResourceLocker } from './ResourceLocker';

/**
 * A {@link ReadWriteLocker} that gives no priority to read or write operations: both use the same lock.
 */
export class EqualReadWriteLocker implements ReadWriteLocker {
  protected readonly locker: ResourceLocker;

  public constructor(locker: ResourceLocker) {
    this.locker = locker;
  }

  public async withReadLock<T>(identifier: ResourceIdentifier, whileLocked: () => PromiseOrValue<T>): Promise<T> {
    return this.withLock(identifier, whileLocked);
  }

  public async withWriteLock<T>(identifier: ResourceIdentifier, whileLocked: () => PromiseOrValue<T>): Promise<T> {
    return this.withLock(identifier, whileLocked);
  }

  /**
   * Acquires a new lock for the requested identifier.
   * Will resolve when the input function resolves.
   *
   * @param identifier - Identifier of resource that needs to be locked.
   * @param whileLocked - Function to resolve while the resource is locked.
   */
  protected async withLock<T>(identifier: ResourceIdentifier, whileLocked: () => PromiseOrValue<T>): Promise<T> {
    await this.locker.acquire(identifier);
    try {
      return await whileLocked();
    } finally {
      await this.locker.release(identifier);
    }
  }
}
