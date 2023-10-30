import { createHash } from 'node:crypto';
import { getLoggerFor } from '../../logging/LogUtil';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { KeyValueStorage } from './KeyValueStorage';
import { PassthroughKeyValueStorage } from './PassthroughKeyValueStorage';

/**
 * Encodes the input key with SHA-256 hashing,
 * to make sure there are no invalid or special path characters.
 *
 * This class was created specifically to prevent the issue of identifiers being too long when storing data:
 * https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1013
 *
 * This should eventually be replaced by a more structural approach once internal storage has been refactored
 * and data migration from older versions and formats is supported.
 */
export class HashEncodingStorage<T> extends PassthroughKeyValueStorage<T> {
  protected readonly logger = getLoggerFor(this);

  public constructor(source: KeyValueStorage<string, T>) {
    super(source);
  }

  protected toNewKey(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex');
    this.logger.debug(`Hashing key ${key} to ${hash}`);
    return hash;
  }

  protected toOriginalKey(): string {
    throw new NotImplementedHttpError('Hash keys cannot be converted back.');
  }
}
