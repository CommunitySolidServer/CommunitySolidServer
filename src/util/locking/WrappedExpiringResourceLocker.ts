import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import type { ExpiringLock } from './ExpiringLock';
import type { ExpiringResourceLocker } from './ExpiringResourceLocker';
import type { ResourceLocker } from './ResourceLocker';
import { WrappedExpiringLock } from './WrappedExpiringLock';

/**
 * Allows the locking of resources which is needed for non-atomic {@link ResourceStore}s.
 * Differs from {@Link ResourceLocker} by adding expiration logic.
 */
export class WrappedExpiringResourceLocker implements ExpiringResourceLocker {
  protected readonly logger = getLoggerFor(this);

  protected readonly locker: ResourceLocker;
  protected readonly expiration: number;

  /**
   * @param locker - Instance of ResourceLocker to use for acquiring a lock.
   * @param expiration - Time in ms after which the lock expires.
   */
  public constructor(locker: ResourceLocker, expiration: number) {
    this.locker = locker;
    this.expiration = expiration;
  }

  /**
   * Lock the given resource with a lock providing expiration functionality.
   * @param identifier - Identifier of the resource that needs to be locked.
   *
   * @returns A promise containing the expiring lock on the resource.
   */
  public async acquire(identifier: ResourceIdentifier): Promise<ExpiringLock> {
    const innerLock = await this.locker.acquire(identifier);
    return new WrappedExpiringLock(innerLock, this.expiration);
  }
}
