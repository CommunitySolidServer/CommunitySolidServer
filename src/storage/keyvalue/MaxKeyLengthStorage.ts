import { createHash } from 'node:crypto';
import { getLoggerFor } from '../../logging/LogUtil';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { KeyValueStorage } from './KeyValueStorage';

type Entry<T> = {
  key: string;
  payload: T;
};

/**
 * A {@link KeyValueStorage} that hashes keys in case they would be longer than the set limit.
 * Hashed keys are prefixed with a certain value to prevent issues with incoming keys that are already hashed.
 * The default max length is 150 and the default prefix is `$hash$`.
 *
 * This class mostly exists to prevent issues when writing storage entries to disk.
 * Keys that are too long would cause issues with the file name limit.
 * For this reason, only the part after the last `/` in a key is hashed, to preserve the expected file structure.
 */
export class MaxKeyLengthStorage<T> implements KeyValueStorage<string, T> {
  protected readonly logger = getLoggerFor(this);

  protected readonly source: KeyValueStorage<string, Entry<T>>;
  protected readonly maxKeyLength: number;
  protected readonly hashPrefix: string;

  public constructor(source: KeyValueStorage<string, Entry<T>>, maxKeyLength = 150, hashPrefix = '$hash$') {
    this.source = source;
    this.maxKeyLength = maxKeyLength;
    this.hashPrefix = hashPrefix;
  }

  public async has(key: string): Promise<boolean> {
    return this.source.has(this.getKey(key));
  }

  public async get(key: string): Promise<T | undefined> {
    return (await this.source.get(this.getKey(key)))?.payload;
  }

  public async set(key: string, value: T): Promise<this> {
    await this.source.set(this.getKeyWithCheck(key), this.wrapPayload(key, value));
    return this;
  }

  public async delete(key: string): Promise<boolean> {
    return this.source.delete(this.getKey(key));
  }

  public async* entries(): AsyncIterableIterator<[string, T]> {
    for await (const [ , val ] of this.source.entries()) {
      yield [ val.key, val.payload ];
    }
  }

  protected wrapPayload(key: string, payload: T): Entry<T> {
    return { key, payload };
  }

  /**
   * Similar to `getKey` but checks to make sure the key does not already contain the prefix.
   * Only necessary for `set` calls.
   */
  protected getKeyWithCheck(key: string): string {
    const parts = key.split('/');

    // Prevent non-hashed keys with the prefix to prevent false hits
    if (parts.at(-1)?.startsWith(this.hashPrefix)) {
      throw new NotImplementedHttpError(`Unable to store keys starting with ${this.hashPrefix}`);
    }

    return this.getKey(key, parts);
  }

  /**
   * Hashes the last part of the key if it is too long.
   * Otherwise, just returns the key.
   */
  protected getKey(key: string, parts?: string[]): string {
    if (key.length <= this.maxKeyLength) {
      return key;
    }

    // Hash the key if it is too long
    parts = parts ?? key.split('/');
    const last = parts.length - 1;
    parts[last] = `${this.hashPrefix}${createHash('sha256').update(parts[last]).digest('hex')}`;
    const newKey = parts.join('/');
    this.logger.debug(`Hashing key ${key} to ${newKey}`);
    return newKey;
  }
}
