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
  protected readonly expiration: number;
  protected readonly identifier: ResourceIdentifier;
  protected timeoutHandle?: NodeJS.Timeout;

  /**
   * @param innerLock - Instance of ResourceLocker to use for acquiring a lock.
   * @param expiration - Time in ms after which the lock expires.
   * @param identifier - Identifier of the resource that needs to be locked.
   */
  public constructor(innerLock: Lock, expiration: number, identifier: ResourceIdentifier) {
    super();
    this.innerLock = innerLock;
    this.expiration = expiration;
    this.identifier = identifier;
    this.scheduleTimeout();
  }

  /**
   * Release this lock.
   * @returns A promise resolving when the release is finished.
   */
  public async release(): Promise<void> {
    this.clearTimeout();
    return this.innerLock.release();
  }

  /**
   * Reset the unlock timer.
   */
  public renew(): void {
    this.clearTimeout();
    this.scheduleTimeout();
  }

  private async expire(): Promise<void> {
    this.logger.verbose(`Lock for ${this.identifier.path} expired after ${this.expiration}ms`);
    this.emit('expired');
    try {
      await this.innerLock.release();
    } catch (error: unknown) {
      this.emit('error', error);
    }
  }

  private clearTimeout(): void {
    clearTimeout(this.timeoutHandle!);
  }

  private scheduleTimeout(): void {
    this.logger.verbose(`Renewed expiring lock for ${this.identifier.path}`);
    this.timeoutHandle = setTimeout((): any => this.expire(), this.expiration);
  }
}
