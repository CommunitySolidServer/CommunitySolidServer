import Redis from 'ioredis';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Finalizable } from '../../init/final/Finalizable';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../errors/InternalServerError';
import type { ReadWriteLocker } from './ReadWriteLocker';
import type { ResourceLocker } from './ResourceLocker';
import type { RedisResourceLock, RedisReadWriteLock } from './scripts/RedisLuaScripts';
import { fromResp2ToBool, REDIS_LUA_SCRIPTS } from './scripts/RedisLuaScripts';

export interface AttemptSettings {
  /** How many times should an operation in Redis be retried. (-1 is indefinitely). */
  retryCount?: number;
  /** The how long should the next retry be delayed (+ some retryJitter) (in ms). */
  retryDelay?: number;
  /** Add a fraction of jitter to the original delay each attempt (in ms). */
  retryJitter?: number;
}

const attemptDefaults: Required<AttemptSettings> = { retryCount: -1, retryDelay: 50, retryJitter: 30 };

// Internal prefix for Redis keys;
const PREFIX_RW = '__RW__';
const PREFIX_LOCK = '__L__';

/**
 * A Redis Locker that can be used as both:
 *  *  a Read Write Locker that uses a (single) Redis server to store the locks and counts.
 *  *  a Resource Locker that uses a (single) Redis server to store the lock.
 * This solution should be process-safe. The only references to locks are string keys
 * derived from identifier paths.
 *
 * The Read Write algorithm roughly goes as follows:
 *  * Acquire a read lock: allowed as long as there is no write lock. On acquiring the read counter goes up.
 *  * Acquire a write lock: allowed as long as there is no other write lock AND the read counter is 0.
 *  * Release a read lock: decreases the read counter with 1
 *  * Release a write lock: unlocks the write lock
 *
 * The Resource locking algorithm uses a single mutex/lock.
 *
 * All operations, such as checking for a write lock AND read count, are executed in a single Lua script.
 * These scripts are used by Redis as a single new command.
 * Redis executes its operations in a single thread, as such, each such operation can be considered atomic.
 *
 * * @see [Redis Commands documentation](https://redis.io/commands/)
 * * @see [Redis Lua scripting documentation](https://redis.io/docs/manual/programmability/)
 * * @see [ioredis Lua scripting API](https://github.com/luin/ioredis#lua-scripting)
 */
export class RedisLocker implements ReadWriteLocker, ResourceLocker, Finalizable {
  protected readonly logger = getLoggerFor(this);

  private readonly redis: Redis;
  private readonly redisRw: RedisReadWriteLock;
  private readonly redisLock: RedisResourceLock;
  private readonly attemptSettings: Required<AttemptSettings>;

  public constructor(redisClient = '127.0.0.1:6379', attemptSettings: AttemptSettings = {}) {
    this.redis = this.createRedisClient(redisClient);
    this.attemptSettings = { ...attemptDefaults, ...attemptSettings };

    // Register lua scripts
    for (const [ name, script ] of Object.entries(REDIS_LUA_SCRIPTS)) {
      this.redis.defineCommand(name, { numberOfKeys: 1, lua: script });
    }

    this.redisRw = this.redis as RedisReadWriteLock;
    this.redisLock = this.redis as RedisResourceLock;
  }

  /**
   * Generate and return a RedisClient based on the provided string
   * @param redisClientString - A string that contains either a host address and a
   *                            port number like '127.0.0.1:6379' or just a port number like '6379'.
   */
  private createRedisClient(redisClientString: string): Redis {
    if (redisClientString.length > 0) {
      // Check if port number or ip with port number
      // Definitely not perfect, but configuring this is only for experienced users
      const match = /^(?:([^:]+):)?(\d{4,5})$/u.exec(redisClientString);
      if (!match || !match[2]) {
        // At least a port number should be provided
        throw new Error(`Invalid data provided to create a Redis client: ${redisClientString}\n
            Please provide a port number like '6379' or a host address and a port number like '127.0.0.1:6379'`);
      }
      const port = Number(match[2]);
      const host = match[1];
      return new Redis(port, host);
    }
    throw new Error(`Empty redisClientString provided!\n
            Please provide a port number like '6379' or a host address and a port number like '127.0.0.1:6379'`);
  }

  /**
   * Try a Redis function according to the set {@link AttemptSettings}
   * Since the locking strategy is custom-built on Redis and Redis itself does not have a lock concept,
   * this function allows us to wait until we acquired a lock.
   *
   * The AttemptSettings will dictate how many times we should retry the Redis functions
   * before giving up and throwing an error.
   *
   * @param fn - The function to try
   *
   * @returns Promise that resolves if operation succeeded. Rejects with error otherwise
   *
   * @see To convert from Redis operation to Promise<boolean> use {@link fromResp2ToBool} to wrap the function
   */
  private async tryRedisFn(fn: () => Promise<boolean>): Promise<void> {
    const settings = this.attemptSettings;
    const maxTries = settings.retryCount === -1 ? Number.POSITIVE_INFINITY : settings.retryCount + 1;
    function calcTime(): number {
      return Math.max(0, settings.retryDelay + Math.floor(Math.random() * settings.retryJitter));
    }

    let tries = 1;
    let acquired = await fn();
    // Keep going until either you get a lock/release or maxTries has been reached.
    while (!acquired && (tries <= maxTries)) {
      await new Promise<void>((resolve): any => setTimeout(resolve, calcTime()));
      acquired = await fn();
      tries += 1;
    }

    // Max tries was reached
    if (tries > maxTries) {
      const err = `The operation did not succeed after the set maximum of tries (${maxTries}).`;
      this.logger.warn(err);
      throw new InternalServerError(err);
    }
  }

  /**
   * Create a scoped Redis key for Read-Write locking.
   * @param identifier - The identifier object to create a Redis key for
   * @returns A scoped Redis key that allows cleanup afterwards without affecting other keys.
   */
  private getReadWriteKey(identifier: ResourceIdentifier): string {
    return `${PREFIX_RW}${identifier.path}`;
  }

  /**
   * Create a scoped Redis key for Resource locking.
   * @param identifier - The identifier object to create a Redis key for
   * @returns A scoped Redis key that allows cleanup afterwards without affecting other keys.
   */
  private getResourceKey(identifier: ResourceIdentifier): string {
    return `${PREFIX_LOCK}${identifier.path}`;
  }

  /* ReadWriteLocker methods */

  public async withReadLock<T>(identifier: ResourceIdentifier, whileLocked: () => (Promise<T> | T)): Promise<T> {
    const key = this.getReadWriteKey(identifier);
    await this.tryRedisFn((): Promise<boolean> => fromResp2ToBool(this.redisRw.acquireReadLock(key)));
    try {
      return await whileLocked();
    } finally {
      await this.tryRedisFn((): Promise<boolean> => fromResp2ToBool(this.redisRw.releaseReadLock(key)));
    }
  }

  public async withWriteLock<T>(identifier: ResourceIdentifier, whileLocked: () => (Promise<T> | T)): Promise<T> {
    const key = this.getReadWriteKey(identifier);
    await this.tryRedisFn((): Promise<boolean> => fromResp2ToBool(this.redisRw.acquireWriteLock(key)));
    try {
      return await whileLocked();
    } finally {
      await this.tryRedisFn((): Promise<boolean> => fromResp2ToBool(this.redisRw.releaseWriteLock(key)));
    }
  }

  /* ResourceLocker methods */

  public async acquire(identifier: ResourceIdentifier): Promise<void> {
    const key = this.getResourceKey(identifier);
    await this.tryRedisFn((): Promise<boolean> => fromResp2ToBool(this.redisLock.acquireLock(key)));
  }

  public async release(identifier: ResourceIdentifier): Promise<void> {
    const key = this.getResourceKey(identifier);
    await this.tryRedisFn((): Promise<boolean> => fromResp2ToBool(this.redisLock.releaseLock(key)));
  }

  /* Finalizer methods */

  public async finalize(): Promise<void> {
    // This for loop is an extra failsafe,
    // this extra code won't slow down anything, this function will only be called to shut down in peace
    try {
      // Remove any lock still open, since once closed, they should no longer be held.
      const keysRw = await this.redisRw.keys(`${PREFIX_RW}*`);
      if (keysRw.length > 0) {
        await this.redisRw.del(...keysRw);
      }

      const keysLock = await this.redisLock.keys(`${PREFIX_LOCK}*`);
      if (keysLock.length > 0) {
        await this.redisLock.del(...keysLock);
      }
    } finally {
      await this.redis.quit();
    }
  }
}

