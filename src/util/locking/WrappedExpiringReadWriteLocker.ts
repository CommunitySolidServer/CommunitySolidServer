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
  protected readonly maxHoldDuration: number;

  /**
   * @param locker - Instance of ResourceLocker to use for acquiring a lock.
   * @param expiration - Time in ms after which the lock expires due to inactivity.
   * @param maxHoldDuration - Maximum total time in ms a lock can be held, independent of activity renewals,
   *                          to prevent continually renewed locks from blocking a resource forever.
   *                          `0`, the default, disables the cap.
   */
  public constructor(locker: ReadWriteLocker, expiration: number, maxHoldDuration = 0) {
    this.locker = locker;
    this.expiration = expiration;
    this.maxHoldDuration = maxHoldDuration;
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
    let maxTimer: Timeout | undefined;
    let createTimeout: () => Timeout;
    let active = true;

    function clearTimers(): void {
      clearTimeout(timer);
      if (maxTimer) {
        clearTimeout(maxTimer);
        maxTimer = undefined;
      }
    }

    // Promise that throws an error when the timer finishes
    const timerPromise = new Promise<never>((resolve, reject): void => {
      // Starts the timer that will cause this promise to error after a given time
      createTimeout = (): Timeout => setTimeout((): void => {
        active = false;
        clearTimers();
        this.logger.error(`Lock expired after ${this.expiration}ms on ${identifier.path}`);
        reject(new InternalServerError(`Lock expired after ${this.expiration}ms on ${identifier.path}`));
      }, this.expiration);

      timer = createTimeout();

      // Absolute deadline on the total hold time, which renewals do not extend
      if (this.maxHoldDuration > 0) {
        maxTimer = setTimeout((): void => {
          active = false;
          clearTimers();
          this.logger.warn(
            `Lock reached its maximum hold duration of ${this.maxHoldDuration}ms on ${identifier.path}`,
          );
          reject(new InternalServerError(
            `Lock reached its maximum hold duration of ${this.maxHoldDuration}ms on ${identifier.path}`,
          ));
        }, this.maxHoldDuration);
      }
    });

    // Restarts the timer
    const renewTimer = (): void => {
      if (!active) {
        return;
      }
      this.logger.verbose(`Renewed expiring lock on ${identifier.path}`);
      clearTimeout(timer);
      timer = createTimeout();
    };

    // Runs the main function and cleans up the timers afterwards
    async function runWithTimeout(): Promise<T> {
      try {
        return await whileLocked(renewTimer);
      } finally {
        active = false;
        clearTimers();
      }
    }

    return Promise.race([ timerPromise, runWithTimeout() ]);
  }
}
