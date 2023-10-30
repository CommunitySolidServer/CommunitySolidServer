import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { InternalServerError } from '../errors/InternalServerError';
import { BaseReadWriteLocker } from './BaseReadWriteLocker';
import type { ResourceLocker } from './ResourceLocker';

/**
 * A {@link BaseReadWriteLocker} that uses the same locker for the main lock and the count lock,
 * and uses a {@link KeyValueStorage} for keeping track of the counter.
 *
 * Since it is completely dependent on other implementations,
 * this locker is threadsafe if its inputs are as well.
 */
export class GreedyReadWriteLocker extends BaseReadWriteLocker {
  protected readonly storage: KeyValueStorage<string, number>;
  protected readonly readSuffix: string;
  protected readonly countSuffix: string;

  /**
   * @param locker - Used for creating read and write locks.
   * @param storage - Used for storing the amount of active read operations on a resource.
   * @param readSuffix - Used to generate the identifier for the lock that is applied when updating the counter.
   * @param countSuffix - Used to generate the identifier that will be used in the storage for storing the counter.
   */
  public constructor(
    locker: ResourceLocker,
    storage: KeyValueStorage<string, number>,
    readSuffix = 'read',
    countSuffix = 'count',
  ) {
    super(locker, locker);
    this.storage = storage;
    this.readSuffix = readSuffix;
    this.countSuffix = countSuffix;
  }

  protected getCountLockIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: `${identifier.path}.${this.readSuffix}` };
  }

  /**
   * This key is used for storing the count of active read operations.
   */
  protected getCountKey(identifier: ResourceIdentifier): string {
    return `${identifier.path}.${this.countSuffix}`;
  }

  /**
   * Updates the count with the given modifier.
   * Creates the data if it didn't exist yet.
   * Deletes the data when the count reaches zero.
   */
  protected async modifyCount(identifier: ResourceIdentifier, mod: number): Promise<number> {
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
