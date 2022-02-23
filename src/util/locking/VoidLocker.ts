import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import type { ExpiringReadWriteLocker } from './ExpiringReadWriteLocker';

/**
 * This locker will execute the whileLocked function without any locking mechanism
 *
 * Do not use this locker in combination with storages that doesn't handle concurrent read/writes gracefully
 */

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop(): void {}

export class VoidLocker implements ExpiringReadWriteLocker {
  protected readonly logger = getLoggerFor(this);

  public constructor() {
    this.logger.warn('Locking mechanism disabled; data integrity during parallel requests not guaranteed.');
  }

  public async withReadLock<T>(
    identifier: ResourceIdentifier,
    whileLocked: (maintainLock: () => void) => T | Promise<T>,
  ): Promise<T> {
    return whileLocked(noop);
  }

  public async withWriteLock<T>(
    identifier: ResourceIdentifier,
    whileLocked: (maintainLock: () => void) => T | Promise<T>,
  ): Promise<T> {
    return whileLocked(noop);
  }
}
