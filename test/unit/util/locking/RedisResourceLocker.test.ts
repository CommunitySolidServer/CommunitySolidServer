// eslint-disable-next-line import/default
import redis from 'redis';
import type { RedisClient } from 'redis';
import { Lock } from 'redlock';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { RedisResourceLocker } from '../../../../src/util/locking/RedisResourceLocker';

// eslint-disable-next-line import/no-named-as-default-member
redis.createClient = jest.fn().mockReturnValue({
  on: jest.fn(),
  quit: jest.fn(),
  get: jest.fn(),
});

describe('A RedisResourceLocker', (): void => {
  let locker: any;
  const identifier = { path: 'http://test.com/foo' };
  beforeEach(async(): Promise<void> => {
    locker = new RedisResourceLocker([ '6379' ]);
    locker.redlock.lock = jest.fn().mockImplementation(
      async(resource: string, ttl: number): Promise<Lock> =>
        new Promise<Lock>((resolve): void => {
          const lock = new Lock(locker.redlock, resource, 'test', ttl, 100);
          resolve(lock);
        }),
    );
    locker.redlock.unlock = jest.fn().mockImplementation(
      async(): Promise<void> =>
        new Promise<void>((resolve): void => {
          resolve();
        }),
    );
    locker.redlock.extend = jest.fn().mockImplementation(
      async(lock: Lock, ttl: number): Promise<Lock> =>
        new Promise<Lock>((resolve): void => {
          lock.expiration += ttl;
          resolve(lock);
        }),
    );
  });

  afterEach((): any => jest.resetAllMocks());

  it('can lock and unlock a resource.', async(): Promise<void> => {
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).resolves.toBeUndefined();
  });

  it('can lock a resource again after it was unlocked.', async(): Promise<void> => {
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).resolves.toBeUndefined();
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
  });

  it('errors when unlocking a resource that was not locked.', async(): Promise<void> => {
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).rejects.toThrow(InternalServerError);
  });

  it('errors when redlock.lock throws an error.', async(): Promise<void> => {
    locker.redlock.lock = jest.fn().mockRejectedValueOnce(InternalServerError);
    await expect(locker.acquire(identifier)).rejects.toThrow(InternalServerError);
  });

  it('errors when redlock.unlock throws an error.', async(): Promise<void> => {
    await locker.acquire(identifier);
    locker.redlock.unlock = jest.fn().mockRejectedValueOnce(InternalServerError);
    await expect(locker.release(identifier)).rejects.toThrow(InternalServerError);
  });

  it('errors when redlock emits a clientError.', async(): Promise<void> => {
    locker.redlock.lock = jest.fn().mockImplementationOnce((): any => locker.redlock.emit('clientError'));
    await expect(locker.acquire(identifier)).rejects.toThrow(InternalServerError);
  });

  it('can acquire different keys simultaneously.', async(): Promise<void> => {
    const results: number[] = [];
    const lock1 = locker.acquire({ path: 'path1' });
    const lock2 = locker.acquire({ path: 'path2' });
    const lock3 = locker.acquire({ path: 'path3' });
    await lock2.then(async(): Promise<void> => {
      results.push(2);
      return locker.release({ path: 'path2' });
    });
    await lock3.then(async(): Promise<void> => {
      results.push(3);
      return locker.release({ path: 'path3' });
    });
    await lock1.then(async(): Promise<void> => {
      results.push(1);
      return locker.release({ path: 'path1' });
    });
    expect(results).toEqual([ 2, 3, 1 ]);
  });

  it('extends a lock indefinitely.', async(): Promise<void> => {
    await locker.acquire(identifier);
    await new Promise((resolve): any => setTimeout(resolve, 3000));
    await expect(locker.release(identifier)).resolves.toBeUndefined();
  });

  it('uses users redlockOptions if passed to constructor.', async(): Promise<void> => {
    locker.redlock = new RedisResourceLocker([ '6379' ], { ttl: 4000 });
    expect(locker.redlock).toBeDefined();
  });

  it('errors on creation when no redis servers are passed to the constructor.', async(): Promise<void> => {
    expect((): any => new RedisResourceLocker([])).toThrow(InternalServerError);
  });

  describe('createRedisClients', (): void => {
    it('should create and return the right amount of redisClients.', async(): Promise<void> => {
      const clientStrings = [ '6379', '127.0.0.1:6378' ];
      const clients: RedisClient[] = locker.createRedisClients(clientStrings);
      expect(clients).toHaveLength(clientStrings.length);
    });

    it('errors when invalid string is passed.', async(): Promise<void> => {
      const clientStrings = [ 'noHostOrPort' ];
      expect((): any => locker.createRedisClients(clientStrings)).toThrow();
    });
  });
});
