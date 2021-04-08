import { assert } from 'console';
import type { RedisClient } from 'redis';
import { createClient } from 'redis';
import type { Lock } from 'redlock';
import Redlock from 'redlock';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../errors/InternalServerError';
import type { ResourceLocker } from './ResourceLocker';

// The ttl set on a lock, not really important cause redlock wil not handle expiration
const ttl = 10000;
// The default redlock config
const defaultRedlockConfig = {
  // The expected clock drift; for more details
  // see http://redis.io/topics/distlock
  // Multiplied by lock ttl to determine drift time
  driftFactor: 0.01,
  // The max number of times Redlock will attempt
  // to lock a resource before erroring
  retryCount: 1000000,
  // The time in ms between attempts
  retryDelay: 200,
  // The max time in ms randomly added to retries
  // to improve performance under high contention
  // see https://www.awsarchitectureblog.com/2015/03/backoff.html
  retryJitter: 200,
};
/**
 * A locking system that uses a Redis server or any number of
 * Redis nodes / clusters
 * This solution has issues though:
 *  - Redlock wants to handle expiration itself, this is against the design of a ResourceLocker.
 *    The workaround for this is to extend an active lock indefinitely.
 *  - This solution is not multithreaded! If threadA locks a resource, only threadA can unlock this resource.
 *    If threadB wont be able to lock a resource if threadA already acquired that lock,
 *    in that sense it is kind of multithreaded.
 *  - Redlock does not provide the ability to see which locks have expired
 */
export class RedisResourceLocker implements ResourceLocker {
  protected readonly logger = getLoggerFor(this);

  private readonly redlock: Redlock;
  private readonly lockList: Map<string, Lock>;
  private readonly intervals: Map<string, NodeJS.Timeout>;

  public constructor(redisClients: string[], redlockOptions?: Record<string, number>) {
    this.lockList = new Map();
    this.intervals = new Map();
    const clients = this.createRedisClients(redisClients);
    this.redlock = this.createRedlock(clients, redlockOptions);
    this.redlock.on('clientError', (err): void => {
      throw new InternalServerError(`Redis/Redlock error: ${err}`);
    });
  }

  /**
   * Generate and return a list of RedisClients based on the provided strings
   * @param redisClientsStrings - a list of strings that contain either a host address and a
   * port number like '127.0.0.1:6379' or just a port number like '6379'
   */
  private createRedisClients(redisClientsStrings: string[]): RedisClient[] {
    const result: RedisClient[] = [];
    if (redisClientsStrings && redisClientsStrings.length > 0) {
      for (const client of redisClientsStrings) {
        // Check if port number or ip with port number
        // Definitely not perfect, but configuring this is only for experienced users
        const match = new RegExp(/^(?:([^:]+):)?(\d{4,5})$/u, 'u').exec(client);
        if (!match || !match[2]) {
          // At least a port number should be provided
          throw new Error(`Invalid data provided to create a Redis client: ${client}\n
            Please provide a port number like '6379' or a host address and a port number like '127.0.0.1:6379'`);
        }
        const port = Number(match[2]);
        const host = match[1];
        const redisclient = createClient(port, host);
        result.push(redisclient);
      }
    }
    return result;
  }

  /**
   * Generate and return a Redlock instance
   * @param clients - a list of RedisClients you want to use for the redlock instance
   * @param redlockOptions - extra redlock options to overwrite the default config
   */
  private createRedlock(clients: RedisClient[], redlockOptions: Record<string, number> = {}): Redlock {
    try {
      return new Redlock(
        clients,
        { ...defaultRedlockConfig, ...redlockOptions },
      );
    } catch (error: unknown) {
      throw new InternalServerError(`Error initializing Redlock for clients: ${clients}, ${error}`);
    }
  }

  public async quit(): Promise<void> {
    // This for loop is an extra failsafe,
    // this extra code wont slow down anything, this function will only be called to shut down in peace
    for (const entry of this.lockList) {
      const key = entry[0];
      const lock = this.lockList.get(key);
      if (lock) {
        await this.release({ path: lock.resource });
      } else {
        this.lockList.delete(key);
      }
    }
    await this.redlock.quit();
  }

  public async acquire(identifier: ResourceIdentifier): Promise<void> {
    const resource = identifier.path;
    let lock: Lock | undefined;
    try {
      lock = await this.redlock.lock(resource, ttl);
      assert(lock);
      // Lock acquired
      this.logger.debug(`Acquired lock for resource: ${resource}!`);
      this.lockList.set(resource, lock);
      this.extendLockIndefinitely(resource);
    } catch (error: unknown) {
      this.logger.debug(`Unable to acquire lock for ${resource}`);
      throw new InternalServerError(`Unable to acquire lock for ${resource} (${error})`);
    }
  }

  public async release(identifier: ResourceIdentifier): Promise<void> {
    const resource = identifier.path;
    const lock: Lock | undefined = this.lockList.get(resource);
    if (!lock) {
      // Lock is invalid
      this.logger.warn(`Unexpected release request for non-existent lock on ${resource}`);
      throw new InternalServerError(`Trying to unlock resource that is not locked: ${resource}`);
    }
    try {
      await this.redlock.unlock(lock);
      // Successfully released lock
      this.lockList.delete(resource);
      const interval = this.intervals.get(resource);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(resource);
      }
      this.logger.debug(`Released lock for ${resource}, ${this.getLockCount()} active locks remaining!`);
    } catch (error: unknown) {
      this.logger.error(`Error releasing lock for ${resource} (${error})`);
      throw new InternalServerError(`Unable to release lock for: ${resource}, ${error}`);
    }
  }

  /**
   * Counts the number of active locks.
   */
  private getLockCount(): number {
    return this.lockList.size;
  }

  /**
   * This function is internally used to keep an acquired lock active, a wrapper class will handle expiration
   * @param lock - the lock to be extended
   */
  private extendLockIndefinitely(identifier: string): void {
    const interval = setInterval(async(): Promise<void> => {
      try {
        const lock = this.lockList.get(identifier);
        if (lock) {
          const newLock = await this.redlock.extend(lock, ttl);
          this.lockList.set(identifier, newLock);
          this.logger.debug(`Extended (Redis)lock for resource: ${identifier}`);
        } else {
          throw new Error('No Lock was found to extend');
        }
      } catch (error: unknown) {
        // No error should be re-thrown cause this means the lock has simply been released
        this.logger.error(`Failed to extend this (Redis)lock for resource: ${identifier}, ${error}`);
        clearInterval(interval);
        this.intervals.delete(identifier);
      }
    }, ttl / 2);
    this.intervals.set(identifier, interval);
  }
}
