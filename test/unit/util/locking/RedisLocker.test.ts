import EventEmitter from 'events';
import type { Redis } from 'ioredis';
import type { ReadWriteLocker, ResourceLocker } from '../../../../src';
import { InternalServerError } from '../../../../src';
import { RedisLocker } from '../../../../src/util/locking/RedisLocker';
import type { RedisResourceLock, RedisReadWriteLock } from '../../../../src/util/locking/scripts/RedisLuaScripts';
import { flushPromises } from '../../../util/Util';

interface LockState {
  reads: number;
  lock: boolean;
}

const store = {
  ensureKey(key: string): void {
    if (!(key in this.internal)) {
      this.internal[key] = { lock: false, reads: 0 };
    }
  },
  internal: {} as Record<string, LockState>,
  reset(): void {
    this.internal = {};
  },
  acquireReadLock(key: string): number {
    this.ensureKey(key);
    if (this.internal[key].lock) {
      return 0;
    }
    this.internal[key].reads += 1;
    return 1;
  },
  acquireWriteLock(key: string): number | null | 'OK' {
    this.ensureKey(key);
    if (this.internal[key].lock || this.internal[key].reads > 0) {
      return 0;
    }

    this.internal[key].lock = true;
    return 'OK';
  },
  releaseReadLock(key: string): number {
    this.internal[key].reads -= 1;
    return 1;
  },
  releaseWriteLock(key: string): number | null {
    if (!this.internal[key] || !this.internal[key].lock) {
      return null;
    }
    this.internal[key].lock = false;
    return 1;
  },
  acquireLock(key: string): number | null | 'OK' {
    this.ensureKey(key);
    if (this.internal[key].lock) {
      return 0;
    }
    this.internal[key].lock = true;
    return 'OK';
  },
  releaseLock(key: string): number | string {
    if (!(key in this.internal) || !this.internal[key].lock) {
      return '-ERR Can\'t release non-existing lock.\r\n';
    }
    this.internal[key].lock = false;
    return 1;
  },

};

const redis: jest.Mocked<Redis & RedisResourceLock & RedisReadWriteLock> = {
  defineCommand: jest.fn(),
  quit: jest.fn(),
  keys: jest.fn().mockImplementation(async(pattern: string): Promise<string[]> =>
    Object.keys(store.internal)
      .filter((value: string): boolean => new RegExp(pattern, 'u').test(value))),
  del: jest.fn().mockImplementation(async(...keys: string[]): Promise<number> => {
    let deletedEntries = 0;
    for (const key of keys) {
      if (typeof store.internal[key] !== 'undefined') {
        deletedEntries += 1;
      }
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete store.internal[key];
    }
    return deletedEntries;
  }),
  acquireReadLock: jest.fn().mockImplementation(async(key: string): Promise<number> =>
    store.acquireReadLock(key)),
  acquireWriteLock: jest.fn().mockImplementation(async(key: string): Promise<number | null | 'OK'> =>
    store.acquireWriteLock(key)),
  releaseReadLock: jest.fn().mockImplementation(async(key: string): Promise<number> =>
    store.releaseReadLock(key)),
  releaseWriteLock: jest.fn().mockImplementation(async(key: string): Promise<number | null> =>
    store.releaseWriteLock(key)),
  acquireLock: jest.fn().mockImplementation(async(key: string): Promise<number | null | 'OK'> =>
    store.acquireLock(key)),
  releaseLock: jest.fn().mockImplementation(async(key: string): Promise<number | null | string> =>
    store.releaseLock(key)),
} as any;

jest.mock('ioredis', (): any => jest.fn().mockImplementation((): Redis => redis));

describe('A RedisLocker', (): void => {
  describe('with Read-Write logic', (): void => {
    const resource1 = { path: 'http://test.com/resource' };
    const resource2 = { path: 'http://test.com/resource2' };
    let locker: RedisLocker;

    beforeEach(async(): Promise<void> => {
      store.reset();
      jest.clearAllMocks();
      locker = new RedisLocker('6379');
    });

    afterEach(async(): Promise<void> => {
    // In case some locks are not released by a test the timers will still be running
      jest.clearAllTimers();
    });

    afterAll(async(): Promise<void> => {
      jest.restoreAllMocks();
    });

    it('will fill in default arguments when constructed with empty arguments.', (): void => {
      expect((): ReadWriteLocker => new RedisLocker()).toBeDefined();
      expect((): ReadWriteLocker => new RedisLocker()).not.toThrow();
    });

    it('errors when instantiated with incorrect arguments.', (): void => {
      const arg = 'wrongRedisString';
      expect((): RedisLocker => new RedisLocker(arg))
        .toThrow(`Invalid data provided to create a Redis client: ${arg}`);
      expect((): RedisLocker => new RedisLocker(''))
        .toThrow(`Empty redisClientString provided!`);
    });

    it('errors when instantiated with empty arguments.', (): void => {
      expect((): RedisLocker => new RedisLocker(''))
        .toThrow(`Empty redisClientString provided!`);
    });

    it('does not block single read operations.', async(): Promise<void> => {
      await expect(locker.withReadLock(resource1, (): any => 5)).resolves.toBe(5);
    });

    it('does not block single write operations.', async(): Promise<void> => {
      await expect(locker.withWriteLock(resource1, (): any => 5)).resolves.toBe(5);
    });

    it('does not block multiple read operations.', async(): Promise<void> => {
      const order: string[] = [];
      const emitter = new EventEmitter();

      const unlocks = [ 0, 1, 2 ].map((num): any => new Promise((resolve): any =>
        emitter.on(`release${num}`, resolve)));
      const promises = [ 0, 1, 2 ].map((num): any => locker.withReadLock(resource1, async(): Promise<number> => {
        order.push(`start ${num}`);
        await unlocks[num];
        order.push(`finish ${num}`);
        return num;
      }));

      // Allow time to attach listeners
      await flushPromises();

      emitter.emit('release2');
      await expect(promises[2]).resolves.toBe(2);
      emitter.emit('release0');
      await expect(promises[0]).resolves.toBe(0);
      emitter.emit('release1');
      await expect(promises[1]).resolves.toBe(1);

      expect(order).toEqual([ 'start 0', 'start 1', 'start 2', 'finish 2', 'finish 0', 'finish 1' ]);
    });

    it('blocks multiple write operations without guaranteed order (fairness).', async(): Promise<void> => {
      const order: string[] = [];
      const emitter = new EventEmitter();

      const unlocks = [ 0, 1, 2 ].map((num): any => new Promise((resolve): any =>
        emitter.on(`release${num}`, resolve)));
      const promises = [ 0, 1, 2 ].map((num): any => locker.withWriteLock(resource1, async(): Promise<number> => {
        order.push(`start ${num}`);
        await unlocks[num];
        order.push(`finish ${num}`);
        return num;
      }));

      // Allow time to attach listeners
      await flushPromises();

      emitter.emit('release2');

      // Allow time to finish write 2
      await flushPromises();

      emitter.emit('release0');
      emitter.emit('release1');
      await Promise.all([ promises[2], promises[0], promises[1] ]);
      expect(order).toHaveLength(6);
      expect(order.slice(0, 2)).toEqual([ 'start 0', 'finish 0' ]);
      expect(order.slice(2)
        .map((el): boolean => [ 'start 1', 'finish 1', 'start 2', 'finish 2' ].includes(el))).toBeTruthy();
    });

    it('allows multiple write operations on different resources.', async(): Promise<void> => {
      const order: string[] = [];
      const emitter = new EventEmitter();

      const resources = [ resource1, resource2 ];
      const unlocks = [ 0, 1 ].map((num): any => new Promise((resolve): any => emitter.on(`release${num}`, resolve)));
      const promises = [ 0, 1 ].map((num): any => locker.withWriteLock(resources[num], async(): Promise<number> => {
        order.push(`start ${num}`);
        await unlocks[num];
        order.push(`finish ${num}`);
        return num;
      }));

      // Allow time to attach listeners
      await flushPromises();

      emitter.emit('release1');
      await expect(promises[1]).resolves.toBe(1);
      emitter.emit('release0');
      await expect(promises[0]).resolves.toBe(0);

      expect(order).toEqual([ 'start 0', 'start 1', 'finish 1', 'finish 0' ]);
    });

    it('blocks write operations during read operations.', async(): Promise<void> => {
      const order: string[] = [];
      const emitter = new EventEmitter();

      const promRead = new Promise((resolve): any => {
        emitter.on('releaseRead', resolve);
      });

      // We want to make sure the write operation only starts while the read operation is busy
      // Otherwise the internal write lock might not be acquired yet
      const delayedLockWrite = new Promise<void>((resolve): void => {
        emitter.on('readStarted', (): void => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
          locker.withWriteLock(resource1, (): any => {
            order.push('write');
            resolve();
          });
        });
      });

      const lockRead = locker.withReadLock(resource1, async(): Promise<void> => {
        emitter.emit('readStarted');
        order.push('read start');
        await promRead;
        order.push('read finish');
      });

      // Allow time to attach listeners
      await flushPromises();

      const promAll = Promise.all([ delayedLockWrite, lockRead ]);

      emitter.emit('releaseRead');
      await promAll;
      expect(order).toEqual([ 'read start', 'read finish', 'write' ]);
    });

    it('allows write operations on different resources during read operations.', async(): Promise<void> => {
      const order: string[] = [];
      const emitter = new EventEmitter();

      const promRead = new Promise((resolve): any => {
        emitter.on('releaseRead', resolve);
      });

      const delayedLockWrite = new Promise<void>((resolve): void => {
        emitter.on('readStarted', (): void => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
          locker.withWriteLock(resource2, (): any => {
            order.push('write');
            resolve();
          });
        });
      });

      const lockRead = locker.withReadLock(resource1, async(): Promise<void> => {
        emitter.emit('readStarted');
        order.push('read start');
        await promRead;
        order.push('read finish');
      });

      // Allow time to attach listeners
      await flushPromises();

      const promAll = Promise.all([ delayedLockWrite, lockRead ]);

      emitter.emit('releaseRead');
      await promAll;
      expect(order).toEqual([ 'read start', 'write', 'read finish' ]);
    });

    it('prioritizes read operations when a read operation is waiting.', async(): Promise<void> => {
    // This test is very similar to the previous ones but adds an extra read lock
      const order: string[] = [];
      const emitter = new EventEmitter();

      const promRead1 = new Promise((resolve): any => emitter.on('releaseRead1', resolve));
      const promRead2 = new Promise((resolve): any => emitter.on('releaseRead2', resolve));

      const delayedLockWrite = new Promise<void>((resolve): void => {
        emitter.on('readStarted', (): void => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
          locker.withWriteLock(resource1, (): any => {
            order.push('write');
            resolve();
          });
        });
      });

      const delayedLockRead2 = new Promise<void>((resolve): void => {
        emitter.on('readStarted', (): void => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
          locker.withReadLock(resource1, async(): Promise<void> => {
            order.push('read 2 start');
            await promRead2;
            order.push('read 2 finish');
            resolve();
          });
        });
      });

      const lockRead = locker.withReadLock(resource1, async(): Promise<void> => {
        emitter.emit('readStarted');
        order.push('read 1 start');
        await promRead1;
        order.push('read 1 finish');
      });

      // Allow time to attach listeners
      await flushPromises();

      const promAll = Promise.all([ delayedLockWrite, lockRead, delayedLockRead2 ]);

      emitter.emit('releaseRead1');

      // Allow time to finish read 1
      await flushPromises();

      emitter.emit('releaseRead2');
      await promAll;
      expect(order).toEqual([ 'read 1 start', 'read 2 start', 'read 1 finish', 'read 2 finish', 'write' ]);
    });

    it('blocks read operations during write operations.', async(): Promise<void> => {
    // Again similar but with read and write order switched
      const order: string[] = [];
      const emitter = new EventEmitter();

      const promWrite = new Promise((resolve): any => {
        emitter.on('releaseWrite', resolve);
      });

      // We want to make sure the read operation only starts while the write operation is busy
      const delayedLockRead = new Promise<void>((resolve): void => {
        emitter.on('writeStarted', (): void => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
          locker.withReadLock(resource1, (): any => {
            order.push('read');
            resolve();
          });
        });
      });

      const lockWrite = locker.withWriteLock(resource1, async(): Promise<void> => {
        emitter.emit('writeStarted');
        order.push('write start');
        await promWrite;
        order.push('write finish');
      });

      // Allow time to attach listeners
      await flushPromises();

      const promAll = Promise.all([ delayedLockRead, lockWrite ]);

      emitter.emit('releaseWrite');
      await promAll;
      expect(order).toEqual([ 'write start', 'write finish', 'read' ]);
    });

    it('throws error if Redis answers with null.', async(): Promise<void> => {
      const emitter = new EventEmitter();
      const promise = locker.withWriteLock(resource1, (): any =>
        new Promise<void>((resolve): any => emitter.on('release', resolve)));
      await redis.releaseWriteLock(`__RW__${resource1.path}`);
      await flushPromises();
      emitter.emit('release');
      await expect(promise).rejects.toThrow('Redis operation error detected (value was null).');
    });

    it('errors when a readLock is not possible.', async(): Promise<void> => {
      const locker2 = new RedisLocker('localhost:6379', { retryCount: 0 });
      redis.acquireReadLock.mockResolvedValueOnce(0);
      await expect(locker2.withReadLock(resource1, (): any => 5)).rejects
        .toThrow(/The operation did not succeed after the set maximum of tries \(\d+\)./u);
    });

    it('errors when a writeLock is not possible.', async(): Promise<void> => {
      const locker2 = new RedisLocker('localhost:6379', { retryCount: 0 });
      redis.acquireWriteLock.mockResolvedValueOnce(0);
      await expect(locker2.withWriteLock(resource1, (): any => 5)).rejects
        .toThrow(/The operation did not succeed after the set maximum of tries \(\d+\)./u);
    });

    it('throws error if Redis answers unexpectedly.', async(): Promise<void> => {
      redis.acquireWriteLock.mockResolvedValueOnce('unexpected' as any);
      const promise = locker.withWriteLock(resource1, (): any => ({}));
      await expect(promise).rejects.toThrow('Unexpected Redis answer received! (unexpected)');
    });

    describe('finalize()', (): void => {
      it('should call quit and clear Read-Write locks when finalize() is called.', async(): Promise<void> => {
        const promise = locker.withWriteLock(resource1, async(): Promise<any> => {
          await locker.finalize();
          expect(Object.keys(store.internal)).toHaveLength(0);
          expect(redis.quit).toHaveBeenCalledTimes(1);
        });
        // Auto-release of Read-Write lock should result in an exception, as the Locker has been finalized.
        await expect(promise).rejects.toThrow(/Invalid state/u);
      });
    });
  });

  describe('with resource lock logic', (): void => {
    let locker: RedisLocker;
    const identifier = { path: 'http://test.com/foo' };

    beforeEach(async(): Promise<void> => {
      jest.clearAllMocks();
      locker = new RedisLocker('6379', { retryCount: 5 });
    });

    afterEach(async(): Promise<void> => {
    // In case some locks are not released by a test the timers will still be running
      jest.clearAllTimers();
    });

    afterAll(async(): Promise<void> => {
      jest.restoreAllMocks();
    });

    it('will fill in default arguments when constructed with empty arguments.', (): void => {
      expect((): ResourceLocker => new RedisLocker()).toBeDefined();
      expect((): ResourceLocker => new RedisLocker()).not.toThrow();
    });

    it('can lock and unlock a resource.', async(): Promise<void> => {
      await expect(locker.acquire(identifier)).resolves.toBeUndefined();
      await expect(locker.release(identifier)).resolves.toBeUndefined();
      expect(redis.acquireLock).toHaveBeenCalledTimes(1);
      expect(redis.releaseLock).toHaveBeenCalledTimes(1);
    });

    it('can lock a resource again after it was unlocked.', async(): Promise<void> => {
      await expect(locker.acquire(identifier)).resolves.toBeUndefined();
      await expect(locker.release(identifier)).resolves.toBeUndefined();
      await expect(locker.acquire(identifier)).resolves.toBeUndefined();
      expect(redis.acquireLock).toHaveBeenCalledTimes(2);
      expect(redis.releaseLock).toHaveBeenCalledTimes(1);
      await expect(locker.release(identifier)).resolves.toBeUndefined();
    });

    it('errors when unlocking a resource that was not locked.', async(): Promise<void> => {
      await expect(locker.acquire(identifier)).resolves.toBeUndefined();
      await expect(locker.release(identifier)).resolves.toBeUndefined();
      await expect(locker.release(identifier)).rejects.toThrow(InternalServerError);
      expect(redis.acquireLock).toHaveBeenCalledTimes(1);
      expect(redis.releaseLock).toHaveBeenCalledTimes(2);
    });

    it('errors when Redis.acquireLock throws an error.', async(): Promise<void> => {
      redis.acquireLock.mockResolvedValueOnce('-ERR random Error\r\n');
      const prom = locker.acquire(identifier);
      await expect(prom).rejects.toThrow(InternalServerError);
      await expect(prom).rejects.toThrow('Redis error: random Error');
      expect(redis.acquireLock).toHaveBeenCalledTimes(1);
    });

    it('errors when Redis.releaseLock throws an error.', async(): Promise<void> => {
      await locker.acquire(identifier);
      redis.releaseLock.mockResolvedValueOnce('-ERR random Error\r\n');
      const prom = locker.release(identifier);
      await expect(prom).rejects.toThrow(InternalServerError);
      await expect(prom).rejects.toThrow('Redis error: random Error');
      expect(redis.releaseLock).toHaveBeenCalledTimes(1);
      await expect(locker.release(identifier)).resolves.toBeUndefined();
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

    describe('createRedisClients', (): void => {
      it('errors when invalid string is passed.', async(): Promise<void> => {
      // Reset calls done in `beforeEach`
        jest.clearAllMocks();
        const clientString = 'noHostOrPort';
        expect((): any => new RedisLocker(clientString))
          .toThrow('Invalid data provided to create a Redis client: noHostOrPort');
      });
    });

    describe('initialize()', (): void => {
      it('should clear all locks when initialize() is called.', async(): Promise<void> => {
        await locker.acquire({ path: 'path1' });
        await locker.acquire({ path: 'path2' });
        await locker.initialize();
        expect(Object.keys(store.internal)).toHaveLength(0);
      });
    });

    describe('finalize()', (): void => {
      it('should clear all locks (even when empty) when finalize() is called.', async(): Promise<void> => {
        await locker.finalize();
        expect(Object.keys(store.internal)).toHaveLength(0);
        expect(redis.quit).toHaveBeenCalledTimes(1);
      });

      it('should clear all locks when finalize() is called.', async(): Promise<void> => {
        await locker.acquire({ path: 'path1' });
        await locker.acquire({ path: 'path2' });
        await locker.finalize();
        expect(Object.keys(store.internal)).toHaveLength(0);
        expect(redis.quit).toHaveBeenCalledTimes(1);
      });
    });
  });
});
