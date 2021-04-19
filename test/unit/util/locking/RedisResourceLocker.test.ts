import { EventEmitter } from 'events';
// eslint-disable-next-line import/default
import redis from 'redis';
import Redlock from 'redlock';
import type { Lock } from 'redlock';
import * as LogUtil from '../../../../src/logging/LogUtil';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { RedisResourceLocker } from '../../../../src/util/locking/RedisResourceLocker';

const redlock: jest.Mocked<Redlock> = Object.assign(new EventEmitter(), {
  lock: jest.fn().mockImplementation(async(resource: string, ttl: number): Promise<Lock> =>
    ({ resource, expiration: Date.now() + ttl } as Lock)),
  unlock: jest.fn(),
  extend: jest.fn().mockImplementation(
    async(lock: Lock, ttl: number): Promise<Lock> => {
      lock.expiration += ttl;
      return lock;
    },
  ),
  quit: jest.fn(),
}) as any;

jest.mock('redlock', (): any => jest.fn().mockImplementation((): Redlock => redlock));

jest.useFakeTimers();

describe('A RedisResourceLocker', (): void => {
  let locker: RedisResourceLocker;
  const identifier = { path: 'http://test.com/foo' };
  let createClient: jest.SpyInstance;

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
    redlock.removeAllListeners();

    createClient = jest.spyOn(redis, 'createClient').mockImplementation(jest.fn());

    locker = new RedisResourceLocker([ '6379' ]);
  });

  afterEach(async(): Promise<void> => {
    // In case some locks are not released by a test the timers will still be running
    jest.clearAllTimers();
  });

  afterAll(async(): Promise<void> => {
    jest.restoreAllMocks();
  });

  it('can lock and unlock a resource.', async(): Promise<void> => {
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).resolves.toBeUndefined();
    expect(redlock.lock).toHaveBeenCalledTimes(1);
    expect(redlock.unlock).toHaveBeenCalledTimes(1);
  });

  it('can lock a resource again after it was unlocked.', async(): Promise<void> => {
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).resolves.toBeUndefined();
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    expect(redlock.lock).toHaveBeenCalledTimes(2);
    expect(redlock.unlock).toHaveBeenCalledTimes(1);
    await expect(locker.release(identifier)).resolves.toBeUndefined();
  });

  it('errors when unlocking a resource that was not locked.', async(): Promise<void> => {
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).rejects.toThrow(InternalServerError);
    expect(redlock.lock).toHaveBeenCalledTimes(1);
    expect(redlock.unlock).toHaveBeenCalledTimes(1);
  });

  it('errors when redlock.lock throws an error.', async(): Promise<void> => {
    redlock.lock.mockRejectedValueOnce(new Error('random Error'));
    const prom = locker.acquire(identifier);
    await expect(prom).rejects.toThrow(InternalServerError);
    await expect(prom).rejects.toThrow('Unable to acquire lock for ');
    await expect(prom).rejects.toThrow('Error: random Error');
    expect(redlock.lock).toHaveBeenCalledTimes(1);
  });

  it('errors if redlock.lock resolves but a lock is already stored.', async(): Promise<void> => {
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    // Works since redlock.lock is mocked to always succeed
    const prom = locker.acquire(identifier);
    await expect(prom).rejects.toThrow(InternalServerError);
    await expect(prom).rejects.toThrow(`Acquired duplicate lock on ${identifier.path}`);
  });

  it('errors when redlock.unlock throws an error.', async(): Promise<void> => {
    await locker.acquire(identifier);
    redlock.unlock.mockRejectedValueOnce(new Error('random Error'));
    const prom = locker.release(identifier);
    await expect(prom).rejects.toThrow(InternalServerError);
    await expect(prom).rejects.toThrow('Unable to release lock for: ');
    await expect(prom).rejects.toThrow('Error: random Error');
    expect(redlock.unlock).toHaveBeenCalledTimes(1);
    await expect(locker.release(identifier)).resolves.toBeUndefined();
  });

  it('does not extend when there are no locks to extend.', async(): Promise<void> => {
    await locker.acquire(identifier);
    await locker.release(identifier);
    jest.advanceTimersByTime(20000);
    expect(redlock.extend).toHaveBeenCalledTimes(0);
  });

  it('cleans up if lock extension failed.', async(): Promise<void> => {
    // This should never happen though
    redlock.extend.mockImplementationOnce((): any => {
      throw new Error('random error');
    });
    await locker.acquire(identifier);
    jest.advanceTimersByTime(20000);
    expect(redlock.extend).toHaveBeenCalledTimes(1);
    // Will throw since we removed the lock entry
    await expect(locker.release(identifier)).rejects.toThrow(InternalServerError);
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
    await locker.acquire(identifier);
    jest.advanceTimersByTime(20000);
    await expect(locker.release(identifier)).resolves.toBeUndefined();
  });

  it('uses users redlockOptions if passed to constructor.', async(): Promise<void> => {
    // Reset calls done in `beforeEach`
    jest.clearAllMocks();
    const clients = [ '6379' ];
    const options = {
      driftFactor: 0.2,
      retryCount: 20,
      retryDelay: 2000,
      retryJitter: 2000,
    };
    locker = new RedisResourceLocker(clients, options);
    expect(Redlock).toHaveBeenCalledTimes(1);
    expect(Redlock).toHaveBeenLastCalledWith(expect.any(Array), options);
  });

  it('errors on creation when no redis servers are passed to the constructor.', async(): Promise<void> => {
    expect((): any => new RedisResourceLocker([])).toThrow('At least 1 client should be provided');
  });

  it('errors if there is an issue creating the Redlock.', async(): Promise<void> => {
    (Redlock as unknown as jest.Mock).mockImplementationOnce((): never => {
      throw new Error('redlock error!');
    });
    expect((): any => new RedisResourceLocker([ '1234' ]))
      .toThrow('Error initializing Redlock: Error: redlock error!');
  });

  it('logs redis client errors.', async(): Promise<void> => {
    const logger = { error: jest.fn() };
    const mock = jest.spyOn(LogUtil, 'getLoggerFor');
    mock.mockReturnValueOnce(logger as any);
    locker = new RedisResourceLocker([ '6379' ]);
    expect(logger.error).toHaveBeenCalledTimes(0);
    redlock.emit('clientError', 'problem!');
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith('Redis/Redlock error: problem!');
  });

  describe('createRedisClients', (): void => {
    it('should create and return the right amount of redisClients.', async(): Promise<void> => {
      // Reset calls done in `beforeEach`
      jest.clearAllMocks();
      const clientStrings = [ '6379', '127.0.0.1:6378' ];
      locker = new RedisResourceLocker(clientStrings);
      expect(createClient).toHaveBeenCalledTimes(2);
      expect(createClient).toHaveBeenCalledWith(6379, undefined);
      expect(createClient).toHaveBeenCalledWith(6378, '127.0.0.1');
    });

    it('errors when invalid string is passed.', async(): Promise<void> => {
      // Reset calls done in `beforeEach`
      jest.clearAllMocks();
      const clientStrings = [ 'noHostOrPort' ];
      expect((): any => new RedisResourceLocker(clientStrings))
        .toThrow('Invalid data provided to create a Redis client: noHostOrPort');
      expect(createClient).toHaveBeenCalledTimes(0);
    });
  });

  describe('quit()', (): void => {
    it('should clear all locks and intervals when quit() is called.', async(): Promise<void> => {
      await locker.acquire(identifier);
      await locker.quit();
      expect(redlock.quit).toHaveBeenCalledTimes(1);

      // This works since the Redlock is simply a mock and quit should have cleared the lockMap
      await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    });
  });
});
