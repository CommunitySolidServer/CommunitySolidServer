/* eslint-disable jest/valid-expect-in-promise */
// Line above needed to not get errors while working with Promise.all()
import type { Server } from 'http';
import fetch from 'cross-fetch';
// eslint-disable-next-line import/default
import redis from 'redis';
import type { RedisResourceLocker } from '../../src';
import { joinFilePath } from '../../src';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { describeIf } from '../util/TestHelpers';
import { instantiateFromConfig } from './Config';
/**
 * Test the general functionality of the server using a RedisResourceLocker
 */
describeIf('docker', 'A server with a RedisResourceLocker as ResourceLocker', (): void => {
  const port = 6008;
  const baseUrl = `http://localhost:${port}/`;
  let server: Server;
  let locker: RedisResourceLocker;
  let factory: HttpServerFactory;

  beforeAll(async(): Promise<void> => {
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      'run-with-redlock.json',
      {
        'urn:solid-server:default:variable:baseUrl': baseUrl,
        'urn:solid-server:default:variable:podTemplateFolder': joinFilePath(__dirname, '../assets/templates'),
      },
    ) as Record<string, any>;
    ({ factory, locker } = instances);
    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    await locker.quit();
    await new Promise<void>((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
  });

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
    expect(response.status).toBe(205);

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
    expect(response.status).toBe(205);

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
    expect(response.status).toBe(205);

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

  describe('Test the ResourceLocker itself', (): void => {
    const identifier = { path: 'http://test.com/foo' };

    it('can lock and unlock a resource.', async(): Promise<void> => {
      await expect(locker.acquire(identifier)).resolves.toBeUndefined();
      await expect(locker.release(identifier)).resolves.toBeUndefined();
    });

    it('can lock a resource again after it was unlocked.', async(): Promise<void> => {
      await expect(locker.acquire(identifier)).resolves.toBeUndefined();
      await expect(locker.release(identifier)).resolves.toBeUndefined();
      await expect(locker.acquire(identifier)).resolves.toBeUndefined();
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

    it('Cannot acquire the same lock simultaneously.', async(): Promise<void> => {
      let res = '';
      const lock1 = locker.acquire(identifier);
      const lock2 = locker.acquire(identifier);
      const lock3 = locker.acquire(identifier);

      await new Promise((resolve): any => setImmediate(resolve));

      const l2 = lock2.then(async(): Promise<void> => {
        res += 'l2';
        await locker.release(identifier);
        res += 'r2';
      });
      const l1 = lock1.then(async(): Promise<void> => {
        res += 'l1';
        await locker.release(identifier);
        res += 'r1';
      });
      const l3 = lock3.then(async(): Promise<void> => {
        res += 'l3';
        await locker.release(identifier);
        res += 'r3';
      });
      await Promise.all([ l1, l2, l3 ]);
      expect(res).toContain('l1r1');
      expect(res).toContain('l2r2');
      expect(res).toContain('l3r3');
    });

    it('redis.createClient should not be mocked.', async(): Promise<void> => {
      expect((redis.createClient as jest.Mock).mockImplementation).toBeUndefined();
    });
  });
});
