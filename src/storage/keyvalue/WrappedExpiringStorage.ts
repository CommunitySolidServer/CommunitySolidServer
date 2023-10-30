import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { setSafeInterval } from '../../util/TimerUtil';
import type { ExpiringStorage } from './ExpiringStorage';
import type { KeyValueStorage } from './KeyValueStorage';

// Used as internal storage format
export type Expires<T> = { expires?: string; payload: T };

/**
 * A storage that wraps around another storage and expires resources based on the given (optional) expiry date.
 * Will delete expired entries when trying to get their value.
 * Has a timer that will delete all expired data every hour (default value).
 */
export class WrappedExpiringStorage<TKey, TValue> implements ExpiringStorage<TKey, TValue> {
  protected readonly logger = getLoggerFor(this);
  private readonly source: KeyValueStorage<TKey, Expires<TValue>>;
  private readonly timer: NodeJS.Timeout;

  /**
   * @param source - KeyValueStorage to actually store the data.
   * @param timeout - How often the expired data needs to be checked in minutes.
   */
  public constructor(source: KeyValueStorage<TKey, Expires<TValue>>, timeout = 60) {
    this.source = source;
    this.timer = setSafeInterval(
      this.logger,
      'Failed to remove expired entries',
      this.removeExpiredEntries.bind(this),
      timeout * 60 * 1000,
    );
    this.timer.unref();
  }

  public async get(key: TKey): Promise<TValue | undefined> {
    return this.getUnexpired(key);
  }

  public async has(key: TKey): Promise<boolean> {
    return Boolean(await this.getUnexpired(key));
  }

  public async set(key: TKey, value: TValue, expiration?: number): Promise<this>;
  public async set(key: TKey, value: TValue, expires?: Date): Promise<this>;
  public async set(key: TKey, value: TValue, expireValue?: number | Date): Promise<this> {
    const expires = typeof expireValue === 'number' ? new Date(Date.now() + expireValue) : expireValue;
    if (this.isExpired(expires)) {
      throw new InternalServerError('Value is already expired');
    }
    await this.source.set(key, this.toExpires(value, expires));
    return this;
  }

  public async delete(key: TKey): Promise<boolean> {
    return this.source.delete(key);
  }

  public async* entries(): AsyncIterableIterator<[TKey, TValue]> {
    // Not deleting expired entries here to prevent iterator issues
    for await (const [ key, value ] of this.source.entries()) {
      const { expires, payload } = this.toData(value);
      if (!this.isExpired(expires)) {
        yield [ key, payload ];
      }
    }
  }

  /**
   * Deletes all entries that have expired.
   */
  private async removeExpiredEntries(): Promise<void> {
    this.logger.debug('Removing expired entries');
    const expired: TKey[] = [];
    for await (const [ key, value ] of this.source.entries()) {
      const { expires } = this.toData(value);
      if (this.isExpired(expires)) {
        expired.push(key);
      }
    }
    await Promise.all(expired.map(async(key): Promise<boolean> => this.source.delete(key)));
    this.logger.debug('Finished removing expired entries');
  }

  /**
   * Tries to get the data for the given key.
   * In case the data exists but has expired,
   * it will be deleted and `undefined` will be returned instead.
   */
  private async getUnexpired(key: TKey): Promise<TValue | undefined> {
    const data = await this.source.get(key);
    if (!data) {
      return;
    }
    const { expires, payload } = this.toData(data);
    if (this.isExpired(expires)) {
      await this.source.delete(key);
      return;
    }
    return payload;
  }

  /**
   * Checks if the given data entry has expired.
   */
  private isExpired(expires?: Date): boolean {
    return typeof expires !== 'undefined' && expires < new Date();
  }

  /**
   * Creates a new object where the `expires` field is a string instead of a Date.
   */
  private toExpires(data: TValue, expires?: Date): Expires<TValue> {
    return { expires: expires?.toISOString(), payload: data };
  }

  /**
   * Creates a new object where the `expires` field is a Date instead of a string.
   */
  private toData(expireData: Expires<TValue>): { expires?: Date; payload: TValue } {
    const result: { expires?: Date; payload: TValue } = { payload: expireData.payload };
    if (expireData.expires) {
      result.expires = new Date(expireData.expires);
    }
    return result;
  }
}
