import EventEmitter from 'events';
import fetch from 'cross-fetch';
import Redis, { ReplyError } from 'ioredis';
import type { App } from '../../src';
import type { RedisLocker } from '../../src/util/locking/RedisLocker';
import type { RedisReadWriteLock, RedisResourceLock } from '../../src/util/locking/scripts/RedisLuaScripts';
import { REDIS_LUA_SCRIPTS } from '../../src/util/locking/scripts/RedisLuaScripts';
import { describeIf, flushPromises, getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, instantiateFromConfig } from './Config';
/**
 * Test the general functionality of the server using a RedisLocker with Read-Write strategy.
 */
describeIf('docker', 'A server with a RedisLocker', (): void => {
  const port = getPort('RedisLocker');
  const baseUrl = `http://localhost:${port}/`;
  let app: App;
  let locker: RedisLocker;

  beforeAll(async(): Promise<void> => {
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      getTestConfigPath('server-redis-lock.json'),
      getDefaultVariables(port, baseUrl),
    ) as Record<string, any>;
    ({ app, locker } = instances);
    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  describe('has a locker that', (): void => {
    it('can add a file to the store, read it and delete it.', async(): Promise<void> => {
      // Create file
      const fileUrl = `${baseUrl}testfile2.txt`;
      const fileData = 'TESTFILE2';

      let response = await fetch(fileUrl, {
        method: 'PUT',
        headers: {
          'content-type': 'text/plain',
        },
        body: fileData,
      });
      expect(response.status).toBe(201);

      // Get file
      response = await fetch(fileUrl);
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toContain('TESTFILE2');

      // DELETE file
      response = await fetch(fileUrl, { method: 'DELETE' });
      expect(response.status).toBe(205);
      response = await fetch(fileUrl);
      expect(response.status).toBe(404);
    });

    it('can create a folder and delete it.', async(): Promise<void> => {
      const containerPath = 'secondfolder/';
      const containerUrl = `${baseUrl}${containerPath}`;
      // PUT
      let response = await fetch(containerUrl, {
        method: 'PUT',
        headers: {
          'content-type': 'text/plain',
        },
      });
      expect(response.status).toBe(201);

      // GET
      response = await fetch(containerUrl);
      expect(response.status).toBe(200);

      // DELETE
      response = await fetch(containerUrl, { method: 'DELETE' });
      expect(response.status).toBe(205);
      response = await fetch(containerUrl);
      expect(response.status).toBe(404);
    });

    it('can get a resource multiple times.', async(): Promise<void> => {
      const fileUrl = `${baseUrl}image.png`;
      const fileData = 'testtesttest';

      let response = await fetch(fileUrl, {
        method: 'PUT',
        headers: {
          'content-type': 'text/plain',
        },
        body: fileData,
      });
      expect(response.status).toBe(201);

      // GET 4 times
      for (let i = 0; i < 4; i++) {
        const res = await fetch(fileUrl);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('text/plain');
        const body = await res.text();
        expect(body).toContain('testtesttest');
      }

      // DELETE
      response = await fetch(fileUrl, { method: 'DELETE' });
      expect(response.status).toBe(205);
      response = await fetch(fileUrl);
      expect(response.status).toBe(404);
    });
  });

  describe('implements ResoureLocker and', (): void => {
    const identifier = { path: 'http://test.com/foo' };

    it('can acquire a resource.', async(): Promise<void> => {
      await expect(locker.acquire(identifier)).resolves.toBeUndefined();
      // Clean up lock
      await locker.release(identifier);
    });

    it('can release a resource.', async(): Promise<void> => {
      await expect(locker.acquire(identifier)).resolves.toBeUndefined();
      await expect(locker.release(identifier)).resolves.toBeUndefined();
    });

    it('can acquire different locks simultaneously.', async(): Promise<void> => {
      const lock1 = locker.acquire({ path: 'path1' });
      const lock2 = locker.acquire({ path: 'path2' });
      const lock3 = locker.acquire({ path: 'path3' });
      const release1 = locker.release({ path: 'path1' });
      const release2 = locker.release({ path: 'path2' });
      const release3 = locker.release({ path: 'path3' });

      await expect(Promise.all([ lock1, lock2, lock3 ])).resolves.toBeDefined();
      // Clean up locks
      await Promise.all([ release1, release2, release3 ]);
    });

    it('cannot acquire the same lock simultaneously.', async(): Promise<void> => {
      await expect(locker.acquire(identifier)).resolves.toBeUndefined();
      await expect(locker.acquire(identifier)).rejects
        .toThrow(/The operation did not succeed after the set maximum of tries \(\d+\)./u);
      await expect(locker.acquire(identifier)).rejects
        .toThrow(/The operation did not succeed after the set maximum of tries \(\d+\)./u);
    });
  });

  describe('implements ReadWriteLocker and', (): void => {
    const identifier = { path: 'http://test.com/foo' };

    it('can read a resource.', async(): Promise<void> => {
      const testFn = jest.fn();
      await expect(locker.withReadLock(identifier, (): any => testFn())).resolves.toBeUndefined();
      expect(testFn).toHaveBeenCalled();
    });

    it('can write a resource.', async(): Promise<void> => {
      const testFn = jest.fn();
      await expect(locker.withWriteLock(identifier, (): any => testFn())).resolves.toBeUndefined();
      expect(testFn).toHaveBeenCalled();
    });

    it('can read a resource twice again after it was unlocked.', async(): Promise<void> => {
      const testFn = jest.fn();
      await expect(locker.withReadLock(identifier, (): any => testFn())).resolves.toBeUndefined();
      expect(testFn).toHaveBeenCalledTimes(1);
      await expect(locker.withReadLock(identifier, (): any => testFn())).resolves.toBeUndefined();
      expect(testFn).toHaveBeenCalledTimes(2);
    });

    it('can acquire different readLocks simultaneously.', async(): Promise<void> => {
      const testFn = jest.fn();
      const lock1 = locker.withReadLock({ path: 'path1' }, (): any => testFn());
      const lock2 = locker.withReadLock({ path: 'path2' }, (): any => testFn());
      const lock3 = locker.withReadLock({ path: 'path3' }, (): any => testFn());

      await expect(Promise.all([ lock1, lock2, lock3 ])).resolves.toBeDefined();
    });

    it('can acquire different writeLocks simultaneously.', async(): Promise<void> => {
      const testFn = jest.fn();
      const lock1 = locker.withWriteLock({ path: 'path1' }, (): any => testFn());
      const lock2 = locker.withWriteLock({ path: 'path2' }, (): any => testFn());
      const lock3 = locker.withWriteLock({ path: 'path3' }, (): any => testFn());

      await expect(Promise.all([ lock1, lock2, lock3 ])).resolves.toBeDefined();
    });

    it('can acquire the same readLock simultaneously.', async(): Promise<void> => {
      let res = '';
      const emitter = new EventEmitter();
      const unlocks = [ 0, 1, 2 ].map((num): Promise<any> =>
        new Promise<any>((resolve): any => emitter.on(`release${num}`, resolve)));
      const promises = [ 0, 1, 2 ].map((num): Promise<any> =>
        locker.withReadLock(identifier, async(): Promise<number> => {
          res += `l${num}`;
          await unlocks[num];
          res += `r${num}`;
          return num;
        }));

      await flushPromises();

      emitter.emit('release1');
      await flushPromises();
      await expect(promises[1]).resolves.toBe(1);
      emitter.emit('release0');
      await flushPromises();
      await expect(promises[0]).resolves.toBe(0);
      emitter.emit('release2');
      await flushPromises();
      await expect(promises[2]).resolves.toBe(2);

      expect(res).toContain('l0l1l2');
      expect(res).toContain('r1r0r2');
    });

    it('cannot acquire the same writeLock simultaneously.', async(): Promise<void> => {
      let res = '';
      const emitter = new EventEmitter();
      const unlocks = [ 0, 1, 2 ].map((num): Promise<any> =>
        new Promise<any>((resolve): any => emitter.on(`release${num}`, resolve)));
      const promises = [ 0, 1, 2 ].map((num): Promise<any> =>
        locker.withWriteLock(identifier, async(): Promise<number> => num));

      const l1 = promises[1].then(async(): Promise<void> => {
        res += 'l1';
        await unlocks[1];
        res += 'r1';
      });
      const l0 = promises[0].then(async(): Promise<void> => {
        res += 'l0';
        await unlocks[0];
        res += 'r0';
      });
      const l2 = promises[2].then(async(): Promise<void> => {
        res += 'l2';
        await unlocks[2];
        res += 'r2';
      });

      emitter.emit('release1');
      emitter.emit('release0');
      emitter.emit('release2');
      await Promise.all([ l0, l1, l2 ]);

      expect(res).toContain('l0r0');
      expect(res).toContain('l1r1');
      expect(res).toContain('l2r2');
    });
  });

  describe('defines custom Redis lua functions', (): void => {
    let redis: Redis & RedisReadWriteLock & RedisResourceLock;

    async function clearRedis(): Promise<void> {
      const keys = await redis.keys('*');
      if (keys && keys.length > 0) {
        await redis.del(keys);
      }
    }

    beforeAll(async(): Promise<void> => {
      redis = new Redis('127.0.0.1:6379') as Redis & RedisReadWriteLock & RedisResourceLock;

      // Register lua scripts
      for (const [ name, script ] of Object.entries(REDIS_LUA_SCRIPTS)) {
        redis.defineCommand(name, { numberOfKeys: 1, lua: script });
      }

      await clearRedis();
    });

    afterAll(async(): Promise<void> => {
      await redis.quit();
    });

    beforeEach(async(): Promise<void> => {
      await clearRedis();
    });

    it('#acquireReadLock.', async(): Promise<void> => {
      const key1 = 'key1';
      const writeKey1 = `${key1}.wlock`;
      const countKey1 = `${key1}.count`;
      // Test fails
      await redis.set(writeKey1, 'locked');
      await expect(redis.acquireReadLock(key1)).resolves.toBe(0);

      // Test succeeds
      await redis.del(writeKey1);
      await expect(redis.acquireReadLock(key1)).resolves.toBe(1);
      await expect(redis.get(countKey1)).resolves.toBe('1');
      await expect(redis.acquireReadLock(key1)).resolves.toBe(1);
      await expect(redis.get(countKey1)).resolves.toBe('2');
      await expect(redis.acquireReadLock(key1)).resolves.toBe(1);
      await expect(redis.get(countKey1)).resolves.toBe('3');
    });

    it('#acquireWriteLock.', async(): Promise<void> => {
      const key1 = 'key1';
      const writeKey1 = `${key1}.wlock`;
      const countKey1 = `${key1}.count`;

      // Test fails because count > 0
      await expect(redis.incr(countKey1)).resolves.toBe(1);
      await expect(redis.acquireWriteLock(key1)).resolves.toBe(0);

      // Test fails because write lock is present
      await clearRedis();
      await redis.set(writeKey1, 'locked');
      await expect(redis.acquireWriteLock(key1)).resolves.toBe(0);

      // Test succeeds
      await clearRedis();
      await expect(redis.acquireWriteLock(key1)).resolves.toBe('OK');

      // Test fails again
      await expect(redis.acquireWriteLock(key1)).resolves.toBe(0);
    });

    it('#releaseReadLock.', async(): Promise<void> => {
      const key1 = 'key1';
      const countKey1 = `${key1}.count`;

      // Test succeeds
      await expect(redis.acquireReadLock(key1)).resolves.toBe(1);
      await expect(redis.acquireReadLock(key1)).resolves.toBe(1);
      await expect(redis.acquireReadLock(key1)).resolves.toBe(1);
      await expect(redis.get(countKey1)).resolves.toBe('3');

      await expect(redis.releaseReadLock(key1)).resolves.toBe(1);
      await expect(redis.releaseReadLock(key1)).resolves.toBe(1);
      await expect(redis.releaseReadLock(key1)).resolves.toBe(1);
      await expect(redis.get(countKey1)).resolves.toBe('0');

      // Test fails
      await expect(redis.releaseReadLock(key1)).rejects
        .toThrow(ReplyError);
      await expect(redis.releaseReadLock(key1)).rejects
        .toThrow('Error trying to release readlock when read count was 0.');
    });

    it('#releaseWriteLock.', async(): Promise<void> => {
      const key1 = 'key1';
      const writeKey1 = `${key1}.wlock`;

      // Test fails
      await expect(redis.releaseWriteLock(key1)).rejects
        .toThrow(ReplyError);
      await expect(redis.releaseWriteLock(key1)).rejects
        .toThrow('Error trying to release writelock that did not exist.');

      // Test succeeds
      await redis.acquireWriteLock(key1);
      await expect(redis.exists(writeKey1)).resolves.toBe(1);
      await expect(redis.get(writeKey1)).resolves.toBe('locked');
      await expect(redis.releaseWriteLock(key1)).resolves.toBe(1);
      await expect(redis.exists(writeKey1)).resolves.toBe(0);
    });

    it('#acquireLock.', async(): Promise<void> => {
      const key1 = 'key1';
      const lockKey1 = `${key1}.lock`;
      // Test succeeds
      await expect(redis.acquireLock(key1)).resolves.toBe('OK');
      await expect(redis.exists(lockKey1)).resolves.toBe(1);
      await expect(redis.get(lockKey1)).resolves.toBe('locked');

      // Test fails
      await expect(redis.acquireLock(key1)).resolves.toBe(0);
      await expect(redis.exists(lockKey1)).resolves.toBe(1);
      await expect(redis.get(lockKey1)).resolves.toBe('locked');

      // Test succeeds again
      await redis.releaseLock(key1);
      await expect(redis.exists(lockKey1)).resolves.toBe(0);
      await expect(redis.acquireLock(key1)).resolves.toBe('OK');
    });

    it('#releaseLock.', async(): Promise<void> => {
      const key1 = 'key1';
      const lockKey1 = `${key1}.lock`;

      // Test fails
      await expect(redis.releaseLock(key1)).rejects
        .toThrow(ReplyError);
      await expect(redis.releaseLock(key1)).rejects
        .toThrow('Error trying to release lock that did not exist.');

      // Test succeeds
      await redis.acquireLock(key1);
      await expect(redis.exists(lockKey1)).resolves.toBe(1);
      await expect(redis.get(lockKey1)).resolves.toBe('locked');
      await expect(redis.releaseLock(key1)).resolves.toBe(1);
      await expect(redis.exists(lockKey1)).resolves.toBe(0);
    });
  });
});

