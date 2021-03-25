// eslint-disable-next-line import/default
import redis from 'redis';
import type { RedisClient } from 'redis';
import { Lock } from 'redlock';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { RedisResourceLocker } from '../../../../src/util/locking/RedisResourceLocker';

describe('A RedisResourceLocker', (): void => {
  let locker: any;
  const identifier = { path: 'http://test.com/foo' };
  beforeEach(async(): Promise<void> => {
    // eslint-disable-next-line import/no-named-as-default-member
    redis.createClient = jest.fn().mockReturnValue({
      on: jest.fn(),
      quit: jest.fn(),
      get: jest.fn(),
    });

    locker = new RedisResourceLocker([ '6379' ]);
    locker.redlock.lock = jest.fn().mockImplementation(
      async(resource: string, ttl: number): Promise<Lock> =>
        new Lock(locker.redlock, resource, 'test', ttl, 100),
    );
    locker.redlock.unlock = jest.fn();
    locker.redlock.extend = jest.fn().mockImplementation(
      async(lock: Lock, ttl: number): Promise<Lock> => {
        lock.expiration += ttl;
        return lock;
      },
    );
  });

  it('can lock and unlock a resource.', async(): Promise<void> => {
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).resolves.toBeUndefined();
    expect(locker.redlock.lock).toHaveBeenCalledTimes(1);
    expect(locker.redlock.unlock).toHaveBeenCalledTimes(1);
  });

  it('can lock a resource again after it was unlocked.', async(): Promise<void> => {
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).resolves.toBeUndefined();
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    expect(locker.redlock.lock).toHaveBeenCalledTimes(2);
    expect(locker.redlock.unlock).toHaveBeenCalledTimes(1);
    await expect(locker.release(identifier)).resolves.toBeUndefined();
  });

  it('errors when unlocking a resource that was not locked.', async(): Promise<void> => {
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).rejects.toThrow(InternalServerError);
    expect(locker.redlock.lock).toHaveBeenCalledTimes(1);
    expect(locker.redlock.unlock).toHaveBeenCalledTimes(1);
  });

  it('errors when redlock.lock throws an error.', async(): Promise<void> => {
    locker.redlock.lock = jest.fn().mockRejectedValue(new Error('random Error'));
    await expect(locker.acquire(identifier)).rejects.toThrow(InternalServerError);
    await expect(locker.acquire(identifier)).rejects.toThrow('Unable to acquire lock for ');
    await expect(locker.acquire(identifier)).rejects.toThrow('Error: random Error');
    expect(locker.redlock.lock).toHaveBeenCalledTimes(3);
  });

  it('errors when redlock.unlock throws an error.', async(): Promise<void> => {
    await locker.acquire(identifier);
    locker.redlock.unlock = jest.fn().mockRejectedValue(new Error('random Error'));
    await expect(locker.release(identifier)).rejects.toThrow(InternalServerError);
    await expect(locker.release(identifier)).rejects.toThrow('Unable to release lock for: ');
    await expect(locker.release(identifier)).rejects.toThrow('Error: random Error');
    expect(locker.redlock.unlock).toHaveBeenCalledTimes(3);
    locker.redlock.unlock = jest.fn();
    await expect(locker.release(identifier)).resolves.toBeUndefined();
  });

  it('does not extend when lockList does not contain the identifiers lock to extend.', async(): Promise<void> => {
    jest.useFakeTimers();
    await locker.acquire(identifier);
    locker.lockList = new Map();
    jest.advanceTimersByTime(20000);
    expect(locker.redlock.extend).toHaveBeenCalledTimes(0);
  });

  it('when redlock.extend throws an error, delete the timeout for that lock and' +
      'make sure extend is only called once.', async(): Promise<void> => {
    locker.redlock.extend = jest.fn().mockImplementation((): any => {
      throw new Error('random error');
    });
    jest.useFakeTimers();
    await locker.acquire(identifier);
    jest.advanceTimersByTime(20000);
    expect(locker.redlock.extend).toHaveBeenCalledTimes(1);
    expect(locker.intervals.keys).toHaveLength(0);
    await expect(locker.release(identifier)).resolves.toBeUndefined();
  });

  it('errors when redlock emits a clientError.', async(): Promise<void> => {
    locker.acquire = jest.fn().mockImplementation(
      (): any => locker.redlock.emit('clientError', 'clientError occurred'),
    );
    await expect(async(): Promise<any> => await locker.acquire(identifier)).rejects.toThrow(InternalServerError);
    await expect(async(): Promise<any> => await locker.acquire(identifier)).rejects.toThrow('clientError occurred');
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
    expect(locker.redlock.lock).toHaveBeenCalledTimes(3);
    expect(locker.redlock.unlock).toHaveBeenCalledTimes(3);
  });

  it('extends a lock indefinitely.', async(): Promise<void> => {
    jest.useFakeTimers();
    await locker.acquire(identifier);
    jest.advanceTimersByTime(20000);
    await expect(locker.release(identifier)).resolves.toBeUndefined();
  });

  it('uses users redlockOptions if passed to constructor.', async(): Promise<void> => {
    const clients = [ '6379' ];
    const options = { ttl: 4000 };
    locker = new RedisResourceLocker(clients, options);
    expect(locker.redlock).toBeDefined();
    // I wasn't able to test the constructor call to Redlock's constructor
    // Expect wants a mocked value and the Redlock constructor is not mocked
    // expect(Redlock).toHaveBeenCalledWith(clients, options);
  });

  it('errors on creation when no redis servers are passed to the constructor.', async(): Promise<void> => {
    expect((): any => new RedisResourceLocker([])).toThrow(InternalServerError);
    expect((): any => new RedisResourceLocker([])).toThrow('Error initializing Redlock for clients:');
    expect((): any => new RedisResourceLocker([])).toThrow(
      'Redlock must be instantiated with at least one redis server.',
    );
  });

  describe('createRedisClients', (): void => {
    it('should create and return the right amount of redisClients.', async(): Promise<void> => {
      const clientStrings = [ '6379', '127.0.0.1:6378' ];
      const clients: RedisClient[] = locker.createRedisClients(clientStrings);
      expect(clients).toHaveLength(clientStrings.length);
      expect(redis.createClient).toHaveBeenCalledWith(6379, undefined);
      expect(redis.createClient).toHaveBeenCalledWith(6378, '127.0.0.1');
    });

    it('errors when invalid string is passed.', async(): Promise<void> => {
      const clientStrings = [ 'noHostOrPort' ];
      expect((): any => locker.createRedisClients(clientStrings)).toThrow(Error);
      expect((): any => locker.createRedisClients(clientStrings)).toThrow(
        `Invalid data provided to create a Redis client: noHostOrPort`,
      );
    });
  });
});
