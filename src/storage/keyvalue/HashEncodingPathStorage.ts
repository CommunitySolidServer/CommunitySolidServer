import { createHash } from 'crypto';
import { getLoggerFor } from '../../logging/LogUtil';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { joinUrl } from '../../util/PathUtil';
import { EncodingPathStorage } from './EncodingPathStorage';

/**
 * A variant of the {@link EncodingPathStorage} that hashes the key instead of converting to base64 encoding.
 *
 * This class was created specifically to prevent the issue of identifiers being too long when storing data:
 * https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1013
 *
 * This should eventually be replaced by a more structural approach once internal storage has been refactored
 * and data migration from older versions and formats is supported.
 */
export class HashEncodingPathStorage<T> extends EncodingPathStorage<T> {
  protected readonly logger = getLoggerFor(this);

  protected keyToPath(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex');
    this.logger.debug(`Hashing key ${key} to ${hash}`);
    return joinUrl(this.basePath, hash);
  }

  protected pathToKey(): string {
    throw new NotImplementedHttpError('Hash keys cannot be converted back.');
  }
}
