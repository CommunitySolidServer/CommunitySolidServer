import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { ForbiddenHttpError } from '../errors/ForbiddenHttpError';
import { InternalServerError } from '../errors/InternalServerError';
import type { PromiseOrValue } from '../PromiseUtil';
import type { ReadWriteLocker } from './ReadWriteLocker';
import type { ResourceLocker } from './ResourceLocker';

export interface GreedyReadWriteSuffixes {
  count: string;
  read: string;
  write: string;
}

/**
 * A {@link ReadWriteLocker} that allows for multiple simultaneous read operations.
 * Write operations will be blocked as long as read operations are not finished.
 * New read operations are allowed while this is going on, which will cause write operations to wait longer.
 *
 * Based on https://en.wikipedia.org/wiki/Readers%E2%80%93writer_lock#Using_two_mutexes .
 * As soon as 1 read lock request is made, the write lock is locked.
 * Internally a counter keeps track of the amount of active read locks.
 * Only when this number reaches 0 will the write lock be released again.
 * The internal read lock is only locked to increase/decrease this counter and is released afterwards.
 * This allows for multiple read operations, although only 1 at the time can update the counter,
 * which means there can still be a small waiting period if there are multiple simultaneous read operations.
 */
export class GreedyReadWriteLocker implements ReadWriteLocker {
  private readonly locker: ResourceLocker;
  private readonly storage: KeyValueStorage<string, number>;
  private readonly suffixes: GreedyReadWriteSuffixes;

  /**
   * @param locker - Used for creating read and write locks.
   * @param storage - Used for storing the amount of active read operations on a resource.
   * @param suffixes - Used to generate identifiers with the given suffixes.
   *                   `count` is used for the identifier used to store the counter.
   *                   `read` and `write` are used for the 2 types of locks that are needed.
   */
  public constructor(locker: ResourceLocker, storage: KeyValueStorage<string, number>,
    suffixes: GreedyReadWriteSuffixes = { count: 'count', read: 'read', write: 'write' }) {
    this.locker = locker;
    this.storage = storage;
    this.suffixes = suffixes;
  }

  public async withReadLock<T>(identifier: ResourceIdentifier, whileLocked: () => PromiseOrValue<T>): Promise<T> {
    await this.preReadSetup(identifier);
    try {
      return await whileLocked();
    } finally {
      await this.postReadCleanup(identifier);
    }
  }

  public async withWriteLock<T>(identifier: ResourceIdentifier, whileLocked: () => PromiseOrValue<T>): Promise<T> {
    if (identifier.path.endsWith(`.${this.suffixes.count}`)) {
      throw new ForbiddenHttpError('This resource is used for internal purposes.');
    }
    const write = this.getWriteLockKey(identifier);
    await this.locker.acquire(write);
    try {
      return await whileLocked();
    } finally {
      await this.locker.release(write);
    }
  }

  /**
   * This key is used for storing the count of active read operations.
   */
  private getCountKey(identifier: ResourceIdentifier): string {
    return `${identifier.path}.${this.suffixes.count}`;
  }

  /**
   * This is the identifier for the read lock: the lock that is used to safely update and read the count.
   */
  private getReadLockKey(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: `${identifier.path}.${this.suffixes.read}` };
  }

  /**
   * This is the identifier for the write lock, making sure there is at most 1 write operation active.
   */
  private getWriteLockKey(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: `${identifier.path}.${this.suffixes.write}` };
  }

  /**
   * Safely updates the count before starting a read operation.
   */
  private async preReadSetup(identifier: ResourceIdentifier): Promise<void> {
    await this.withInternalReadLock(identifier, async(): Promise<void> => {
      const count = await this.incrementCount(identifier, +1);
      if (count === 1) {
        // There is at least 1 read operation so write operations are blocked
        const write = this.getWriteLockKey(identifier);
        await this.locker.acquire(write);
      }
    });
  }

  /**
   * Safely decreases the count after the read operation is finished.
   */
  private async postReadCleanup(identifier: ResourceIdentifier): Promise<void> {
    await this.withInternalReadLock(identifier, async(): Promise<void> => {
      const count = await this.incrementCount(identifier, -1);
      if (count === 0) {
        // All read locks have been released so a write operation is possible again
        const write = this.getWriteLockKey(identifier);
        await this.locker.release(write);
      }
    });
  }

  /**
   * Safely runs an action on the count.
   */
  private async withInternalReadLock<T>(identifier: ResourceIdentifier, whileLocked: () => PromiseOrValue<T>):
  Promise<T> {
    const read = this.getReadLockKey(identifier);
    await this.locker.acquire(read);
    try {
      return await whileLocked();
    } finally {
      await this.locker.release(read);
    }
  }

  /**
   * Updates the count with the given modifier.
   * Creates the data if it didn't exist yet.
   * Deletes the data when the count reaches zero.
   */
  private async incrementCount(identifier: ResourceIdentifier, mod: number): Promise<number> {
    const countKey = this.getCountKey(identifier);
    let number = await this.storage.get(countKey) ?? 0;
    number += mod;
    if (number === 0) {
      // Make sure there is no remaining data once all locks are released
      await this.storage.delete(countKey);
    } else if (number > 0) {
      await this.storage.set(countKey, number);
    } else {
      // Failsafe in case something goes wrong with the count storage
      throw new InternalServerError('Read counter would become negative. Something is wrong with the count storage.');
    }
    return number;
  }
}
