/* eslint-disable jest/valid-expect-in-promise */
// Line above needed to not get errors while working with Promise.al()
import { promises as fs } from 'fs';
import type { Server } from 'http';
import fetch from 'cross-fetch';
import type { RedisResourceLocker } from '../../src';
import { joinFilePath, readableToString } from '../../src';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { instantiateFromConfig } from './Config';
/**
 * Test the general functionality of the server using a RedisResourceLocker
 */
describe('A server with a RedisResourceLocker as ResourceLocker', (): void => {
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
    const fileData = await fs.readFile(
      joinFilePath(__dirname, '../assets/testfile2.txt'),
    );

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
    const body = await readableToString(response.body as any);
    expect(body).toContain('TESTFILE2');

    // DELETE file
    response = await fetch(fileUrl, {
      method: 'DELETE',
    });
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
    response = await fetch(containerUrl, {
      method: 'DELETE',
    });
    expect(response.status).toBe(205);
    response = await fetch(containerUrl);
    expect(response.status).toBe(404);
  });

  it('can upload and delete an image.', async(): Promise<void> => {
    const fileUrl = `${baseUrl}image.png`;
    const fileData = await fs.readFile(
      joinFilePath(__dirname, '../assets/testimage.png'),
    );

    let response = await fetch(fileUrl, {
      method: 'PUT',
      headers: {
        'content-type': 'image/png',
      },
      body: fileData,
    });
    expect(response.status).toBe(205);

    // GET
    response = await fetch(fileUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');

    // DELETE
    response = await fetch(fileUrl, {
      method: 'DELETE',
    });
    expect(response.status).toBe(205);
    response = await fetch(fileUrl);
    expect(response.status).toBe(404);
  });

  it('can get a resource multiple times.', async(): Promise<void> => {
    const fileUrl = `${baseUrl}image.png`;
    const fileData = await fs.readFile(
      joinFilePath(__dirname, '../assets/testimage.png'),
    );

    let response = await fetch(fileUrl, {
      method: 'PUT',
      headers: {
        'content-type': 'image/png',
      },
      body: fileData,
    });
    expect(response.status).toBe(205);

    // GET
    response = await fetch(fileUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    response = await fetch(fileUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    response = await fetch(fileUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    response = await fetch(fileUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');

    // DELETE
    response = await fetch(fileUrl, {
      method: 'DELETE',
    });
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

      const l1 = lock1.then(async(): Promise<void> => {
        res += 'l1';
        await locker.release(identifier);
        res += 'r1';
      });
      const l2 = lock2.then(async(): Promise<void> => {
        res += 'l2';
        await locker.release(identifier);
        res += 'r2';
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
  });
});
