import { EventEmitter } from 'events';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ExpiringLock } from './ExpiringLock';
import type { Lock } from './Lock';

/**
 * An implementation of an expiring lock which defines the expiration logic.
 *
 * ExpiringLock used by a {@link ExpiringResourceLocker} for non-atomic operations.
 * Emits an "expired" event when internal timer runs out and calls release function when this happen.
 */
export class WrappedExpiringLock extends EventEmitter implements ExpiringLock {
  protected readonly logger = getLoggerFor(this);

  protected readonly innerLock: Lock;
  protected readonly readTimeout: number;
  protected readonly identifier: ResourceIdentifier;
  protected timeout: NodeJS.Timeout;

  /**
   * @param innerLock - Instance of ResourceLocker to use for acquiring a lock.
   * @param readTimeout - Time in ms after which reading a representation times out, causing the lock to be released.
   * @param identifier - Identifier of the resource that needs to be locked.
   */
  public constructor(innerLock: Lock, readTimeout: number, identifier: ResourceIdentifier) {
    super();
    this.innerLock = innerLock;
    this.readTimeout = readTimeout;
    this.identifier = identifier;
    this.timeout = setTimeout((): any => this.emitExpired(), readTimeout);
  }

  /**
   * Release this lock.
   * @returns A promise resolving when the release is finished.
   */
  public async release(): Promise<void> {
    clearTimeout(this.timeout);
    return this.innerLock.release();
  }

  /**
   * Reset the unlock timer.
   */
  public renew(): void {
    this.logger.verbose(`Renewed expiring timer of the lock for ${this.identifier.path}`);
    clearTimeout(this.timeout);
    this.timeout = setTimeout((): any => this.emitExpired(), this.readTimeout);
  }

  /**
   * This function will be called when the timer expires.
   */
  protected async emitExpired(): Promise<void> {
    this.logger.verbose(`Lock expired after exceeding timeout of ${this.readTimeout}ms for ${this.identifier.path}`);
    this.emit('expired');
    return this.innerLock.release();
  }
}
