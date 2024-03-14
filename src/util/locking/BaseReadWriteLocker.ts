import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { PromiseOrValue } from '../PromiseUtil';
import { EqualReadWriteLocker } from './EqualReadWriteLocker';
import type { ResourceLocker } from './ResourceLocker';

/**
 * A {@link ReadWriteLocker} that allows for multiple simultaneous read operations.
 * Write operations will be blocked as long as read operations are not finished.
 * New read operations are allowed while this is going on, which will cause write operations to wait longer.
 *
 * Based on https://en.wikipedia.org/wiki/Readers%E2%80%93writer_lock#Using_two_mutexes .
 * As soon as 1 read lock request is made, the main lock is locked.
 * Internally a counter keeps track of the amount of active read locks.
 * Only when this number reaches 0 will the main lock be released again.
 * The internal count lock is only locked to increase/decrease this counter and is released afterwards.
 * This allows for multiple read operations, although only 1 at the time can update the counter,
 * which means there can still be a small waiting period if there are multiple simultaneous read operations.
 *
 * Classes extending this need to implement `getCountLockIdentifier` and `modifyCount`.
 */
export abstract class BaseReadWriteLocker extends EqualReadWriteLocker {
  protected readonly countLocker: ResourceLocker;

  /**
   * @param resourceLocker - Used for creating read and write locks.
   * @param countLocker - Used for creating locks when updating the counter.
   */
  protected constructor(resourceLocker: ResourceLocker, countLocker: ResourceLocker) {
    super(resourceLocker);
    this.countLocker = countLocker;
  }

  public async withReadLock<T>(identifier: ResourceIdentifier, whileLocked: () => PromiseOrValue<T>): Promise<T> {
    await this.acquireReadLock(identifier);
    try {
      return await whileLocked();
    } finally {
      await this.releaseReadLock(identifier);
    }
  }

  /**
   * Safely updates the count before starting a read operation.
   */
  private async acquireReadLock(identifier: ResourceIdentifier): Promise<void> {
    await this.withInternalCountLock(identifier, async(): Promise<void> => {
      const count = await this.modifyCount(identifier, +1);
      if (count === 1) {
        await this.locker.acquire(identifier);
      }
    });
  }

  /**
   * Safely decreases the count after the read operation is finished.
   */
  private async releaseReadLock(identifier: ResourceIdentifier): Promise<void> {
    await this.withInternalCountLock(identifier, async(): Promise<void> => {
      const count = await this.modifyCount(identifier, -1);
      if (count === 0) {
        await this.locker.release(identifier);
      }
    });
  }

  /**
   * Safely runs an action on the count.
   */
  private async withInternalCountLock<T>(identifier: ResourceIdentifier, whileLocked: () => PromiseOrValue<T>):
  Promise<T> {
    const read = this.getCountLockIdentifier(identifier);
    await this.countLocker.acquire(read);
    try {
      return await whileLocked();
    } finally {
      await this.countLocker.release(read);
    }
  }

  /**
   * Generate the identifier that will be used to acquire the count lock for the given identifier.
   * There will be cases where this lock needs to be acquired
   * while an active lock on the main resource is still being maintained.
   * This means that if the input `resourceLocker` and `countLocker` use the same locking system
   * this generated identifier needs to be different.
   */
  protected abstract getCountLockIdentifier(identifier: ResourceIdentifier): ResourceIdentifier;

  /**
   * Update the counter that keeps track of having open read locks there currently are.
   *
   * @param identifier - Identifier on which to update the number of read locks.
   * @param mod - `+1` or `-1`.
   */
  protected abstract modifyCount(identifier: ResourceIdentifier, mod: number): PromiseOrValue<number>;
}
