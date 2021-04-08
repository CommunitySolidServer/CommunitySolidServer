/* eslint-disable jest/valid-expect-in-promise */
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
    // Mocking redis this way because of this issue: https://github.com/facebook/jest/issues/8983
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

  afterAll(async(): Promise<void> => {
    await locker.quit();
    jest.restoreAllMocks();
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
    locker.redlock.lock = jest.fn().mockRejectedValueOnce(new Error('random Error'));
    const prom = locker.acquire(identifier);
    await expect(prom).rejects.toThrow(InternalServerError);
    await expect(prom).rejects.toThrow('Unable to acquire lock for ');
    await expect(prom).rejects.toThrow('Error: random Error');
    expect(locker.redlock.lock).toHaveBeenCalledTimes(1);
  });

  it('errors when redlock.unlock throws an error.', async(): Promise<void> => {
    await locker.acquire(identifier);
    locker.redlock.unlock = jest.fn().mockRejectedValueOnce(new Error('random Error'));
    const prom = locker.release(identifier);
    await expect(prom).rejects.toThrow(InternalServerError);
    await expect(prom).rejects.toThrow('Unable to release lock for: ');
    await expect(prom).rejects.toThrow('Error: random Error');
    expect(locker.redlock.unlock).toHaveBeenCalledTimes(1);
    await expect(locker.release(identifier)).resolves.toBeUndefined();
  });

  it('does not extend when lockList does not contain the identifiers lock to extend.', async(): Promise<void> => {
    jest.useFakeTimers();
    await locker.acquire(identifier);
    locker.lockList = new Map();
    jest.advanceTimersByTime(20000);
    expect(locker.redlock.extend).toHaveBeenCalledTimes(0);
  });

  it('If redlock.extend throws, delete interval + make sure extend is only called once.', async(): Promise<void> => {
    locker.redlock.extend = jest.fn().mockImplementationOnce((): any => {
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
    const lock1 = locker.acquire({ path: 'path1' });
    const lock2 = locker.acquire({ path: 'path2' });
    const lock3 = locker.acquire({ path: 'path3' });

    await expect(Promise.all([ lock1, lock2, lock3 ])).resolves.toBeDefined();

    await locker.release({ path: 'path1' });
    await locker.release({ path: 'path2' });
    await locker.release({ path: 'path3' });
  });

  it('extends a lock indefinitely.', async(): Promise<void> => {
    jest.useFakeTimers();
    await locker.acquire(identifier);
    jest.advanceTimersByTime(20000);
    await expect(locker.release(identifier)).resolves.toBeUndefined();
  });

  it('uses users redlockOptions if passed to constructor.', async(): Promise<void> => {
    const clients = [ '6379' ];
    const options = {
      driftFactor: 0.2,
      retryCount: 20,
      retryDelay: 2000,
      retryJitter: 2000,
    };
    locker = new RedisResourceLocker(clients, options);
    expect(locker.redlock).toBeDefined();
    expect(locker.redlock.retryDelay).toBe(options.retryDelay);
    expect(locker.redlock.retryJitter).toBe(options.retryJitter);
    expect(locker.redlock.retryCount).toBe(options.retryCount);
    expect(locker.redlock.driftFactor).toBe(options.driftFactor);
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

  describe('quit()', (): void => {
    it('should clear all locks and intervals when quit() is called.', async(): Promise<void> => {
      locker.lockList = new Map();
      locker.lockList.set('foo', new Lock(locker.redlock, 'foo', null, 10, 10));
      locker.intervals = new Map();
      locker.intervals.set('foo', setInterval((): any => null), 1000);
      expect(locker.lockList.size).toBe(1);
      expect(locker.intervals.size).toBe(1);
      await locker.quit();
      expect(locker.lockList.size).toBe(0);
      expect(locker.intervals.size).toBe(0);
    });

    it('should clear all locks and intervals when quit() is called and lock is undefined.', async(): Promise<void> => {
      locker.lockList = new Map();
      locker.lockList.set('foo', undefined);
      expect(locker.lockList.size).toBe(1);
      await locker.quit();
      expect(locker.lockList.size).toBe(0);
    });
  });
});
