import type { RedisClient } from 'redis';
import { createClient } from 'redis';
import type { Lock } from 'redlock';
import Redlock from 'redlock';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../errors/InternalServerError';
import type { ResourceLocker } from './ResourceLocker';

/**
 * A locking system that uses a Redis server or any number of
 * Redis nodes / clusters
 */
export class RedisResourceLocker implements ResourceLocker {
  protected readonly logger = getLoggerFor(this);

  protected readonly clients: RedisClient[];
  public readonly redlock: Redlock;

  private readonly lockList: Map<string, Lock>;

  public constructor(redisclients: string[]) {
    this.lockList = new Map();
    this.clients = [];
    if (redisclients) {
      redisclients.forEach((client: string): void => {
        // Check if portnumber or ip with portnumber
        // Defenitely not perfect, but configuring this is only for experienced users
        if (!/(.+:)?[0-9]{4,5}/u.test(client)) {
          throw new Error(`Invalid data provided to create a Redis client: ${client}`);
        }
        const split = client.split(':');
        let res: RedisClient;
        if (split && split.length === 1) {
          // Only a portnumber was provided
          res = createClient(Number(split[0]));
        } else if (split && split.length === 2) {
          // Portnumber and host were provided
          res = createClient(Number(split[1]), split[0]);
        } else {
          throw new Error(`Invalid data provided to create a Redis client: ${client}`);
        }
        this.clients.push(res);
      });
    }
    this.redlock = new Redlock(
      this.clients,
      {
        // The expected clock drift; for more details
        // see http://redis.io/topics/distlock
        // Multiplied by lock ttl to determine drift time
        driftFactor: 0.01,
        // The max number of times Redlock will attempt
        // to lock a resource before erroring
        retryCount: 10,
        // The time in ms between attempts
        retryDelay: 200,
        // The max time in ms randomly added to retries
        // to improve performance under high contention
        // see https://www.awsarchitectureblog.com/2015/03/backoff.html
        // time in ms
        retryJitter: 200,
      },
    );
    this.redlock.on('clientError', (err): void => {
      this.logger.error('A Redis/Redlock error occured', err);
    });
  }

  public async acquire(identifier: ResourceIdentifier): Promise<void> {
    const resource = identifier.path;
    const ttl = 1000;

    return this.redlock.lock(resource, ttl)
      .then((lock): void => {
        if (!lock || lock === undefined) {
          // Problem locking the resource
          throw new Error('Catch error in .catch()');
        } else {
          // Lock acquired
          this.logger.debug(`Acquired lock for resource: ${resource}!`);
          this.lockList.set(resource, lock);
        }
      }).catch((err): void => {
        this.logger.debug(`Unable to acquire lock for ${resource}: ${err}!`);
        throw new InternalServerError(`Unable to acquire lock for ${resource}`);
      });
  }

  public async release(identifier: ResourceIdentifier): Promise<void> {
    const resource = identifier.path;
    const lock: Lock | undefined = this.lockList.get(resource);
    if (!lock) {
      // Lock is invalid
      this.logger.debug(`Unable to release lock for ${resource}: lock was undefined!`);
      throw new InternalServerError(`Trying to unlock resource that is not locked: ${resource}`);
    }
    return lock.unlock().then((): void => {
      // Successfully released lock
      this.lockList.delete(resource);
      this.logger.debug(`Released lock for ${resource}, ${this.getLockCount()} active locks remaining!`);
    }).catch((err): void => {
      this.logger.error(`Error releasing lock for ${resource} (${err})`);
    });
  }

  /**
   * Counts the number of active locks.
   */
  private getLockCount(): number {
    return this.lockList.size;
  }
}
