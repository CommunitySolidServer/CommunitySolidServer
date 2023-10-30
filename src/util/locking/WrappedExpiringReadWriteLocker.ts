import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../errors/InternalServerError';
import type { PromiseOrValue } from '../PromiseUtil';
import type { ExpiringReadWriteLocker } from './ExpiringReadWriteLocker';
import type { ReadWriteLocker } from './ReadWriteLocker';
import Timeout = NodeJS.Timeout;

/**
 * Wraps around an existing {@link ReadWriteLocker} and adds expiration logic to prevent locks from getting stuck.
 */
export class WrappedExpiringReadWriteLocker implements ExpiringReadWriteLocker {
  protected readonly logger = getLoggerFor(this);

  protected readonly locker: ReadWriteLocker;
  protected readonly expiration: number;

  /**
   * @param locker - Instance of ResourceLocker to use for acquiring a lock.
   * @param expiration - Time in ms after which the lock expires.
   */
  public constructor(locker: ReadWriteLocker, expiration: number) {
    this.locker = locker;
    this.expiration = expiration;
  }

  public async withReadLock<T>(
    identifier: ResourceIdentifier,
    whileLocked: (maintainLock: () => void) => PromiseOrValue<T>,
  ): Promise<T> {
    return this.locker.withReadLock(identifier, async(): Promise<T> => this.expiringPromise(identifier, whileLocked));
  }

  public async withWriteLock<T>(
    identifier: ResourceIdentifier,
    whileLocked: (maintainLock: () => void) => PromiseOrValue<T>,
  ): Promise<T> {
    return this.locker.withWriteLock(identifier, async(): Promise<T> => this.expiringPromise(identifier, whileLocked));
  }

  /**
   * Creates a Promise that either resolves the given input function or rejects if time runs out,
   * whichever happens first. The input function can reset the timer by calling the `maintainLock` function
   * it receives. The ResourceIdentifier is only used for logging.
   */
  private async expiringPromise<T>(
    identifier: ResourceIdentifier,
    whileLocked: (maintainLock: () => void) => PromiseOrValue<T>,
  ): Promise<T> {
    let timer: Timeout;
    let createTimeout: () => Timeout;

    // Promise that throws an error when the timer finishes
    const timerPromise = new Promise<never>((resolve, reject): void => {
      // Starts the timer that will cause this promise to error after a given time
      createTimeout = (): Timeout => setTimeout((): void => {
        this.logger.error(`Lock expired after ${this.expiration}ms on ${identifier.path}`);
        reject(new InternalServerError(`Lock expired after ${this.expiration}ms on ${identifier.path}`));
      }, this.expiration);

      timer = createTimeout();
    });

    // Restarts the timer
    const renewTimer = (): void => {
      this.logger.verbose(`Renewed expiring lock on ${identifier.path}`);
      clearTimeout(timer);
      timer = createTimeout();
    };

    // Runs the main function and cleans up the timer afterwards
    async function runWithTimeout(): Promise<T> {
      try {
        return await whileLocked(renewTimer);
      } finally {
        clearTimeout(timer);
      }
    }

    return Promise.race([ timerPromise, runWithTimeout() ]);
  }
}
