import { promises as fsPromises } from 'fs';
import fetch from 'cross-fetch';
import type { Response } from 'cross-fetch';
import type { App } from '../../src';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, getTestFolder, instantiateFromConfig, removeFolder } from './Config';

/** Performs a simple PUT request to the given 'path' with a body containing 'length' amount of characters */
async function performSimplePutWithLength(path: string, length: number): Promise<Response> {
  return fetch(
    path,
    {
      method: 'PUT',
      headers: {
        'content-type': 'text/plain',
      },
      body: 'A'.repeat(length),
    },
  );
}

/** Registers two test pods on the server matching the 'baseUrl' */
async function registerTestPods(baseUrl: string): Promise<void> {
  await fetch(`${baseUrl}idp/register/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'content-length': '120',
    },
    body: 'createWebId=on&webId=&register=on&createPod=on&' +
      'podName=abel&email=abel%40example.ai&password=t&confirmPassword=t&submit=',
  });
  await fetch(`${baseUrl}idp/register/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'content-length': '124',
    },
    body: 'createWebId=on&webId=&register=on&createPod=on&' +
      'podName=arthur&email=arthur%40example.ai&password=t&confirmPassword=t&submit=',
  });
}

describe('A quota server with', (): void => {
  /** Test the general functionality of the server using pod quota */
  describe('pod quota enabled', (): void => {
    const port = getPort('PodQuota');
    const baseUrl = `http://localhost:${port}/`;
    const rootFilePath = getTestFolder('quota-pod');

    let app: App;

    beforeAll(async(): Promise<void> => {
      // Calculate the allowed quota depending on file system used
      const folderSizeTest = await fsPromises.stat(process.cwd());
      const size = (folderSizeTest.size * 2) + 4000;

      const instances = await instantiateFromConfig(
        'urn:solid-server:test:Instances',
        getTestConfigPath('quota-pod.json'),
        {
          ...getDefaultVariables(port, baseUrl),
          'urn:solid-server:default:variable:rootFilePath': rootFilePath,
          'urn:solid-server:default:variable:PodQuota': size,
        },
      ) as Record<string, any>;
      ({ app } = instances);
      await app.start();

      // Initialize 2 pods
      await registerTestPods(baseUrl);
    });

    afterAll(async(): Promise<void> => {
      await app.stop();
      await removeFolder(rootFilePath);
    });

    // Test quota in the first pod
    it('should return a 413 when the quota is exceeded during write.', async(): Promise<void> => {
      const testFile1 = `${baseUrl}abel/profile/test1.txt`;
      const testFile2 = `${baseUrl}abel/test2.txt`;

      const response1 = performSimplePutWithLength(testFile1, 500);
      await expect(response1).resolves.toBeDefined();
      expect((await response1).status).toEqual(201);

      const response2 = performSimplePutWithLength(testFile2, 3000);
      await expect(response2).resolves.toBeDefined();
      expect((await response2).status).toEqual(413);
    });

    // Test if writing in another pod is still possible
    it('should allow writing in a pod that isnt full yet.', async(): Promise<void> => {
      const testFile1 = `${baseUrl}arthur/profile/test1.txt`;

      const response1 = performSimplePutWithLength(testFile1, 500);
      await expect(response1).resolves.toBeDefined();
      expect((await response1).status).toEqual(201);
    });

    // Both pods should not accept this request anymore
    it('should block PUT requests to different pods if their quota is exceeded.', async(): Promise<void> => {
      const testFile1 = `${baseUrl}abel/test2.txt`;
      const testFile2 = `${baseUrl}arthur/test2.txt`;

      const response1 = performSimplePutWithLength(testFile1, 3000);
      await expect(response1).resolves.toBeDefined();
      expect((await response1).status).toEqual(413);

      const response2 = performSimplePutWithLength(testFile2, 3000);
      await expect(response2).resolves.toBeDefined();
      expect((await response2).status).toEqual(413);
    });
  });

  /** Test the general functionality of the server using global quota */
  describe('global quota enabled', (): void => {
    const port = getPort('GlobalQuota');
    const baseUrl = `http://localhost:${port}/`;
    const rootFilePath = getTestFolder('quota-global');

    let app: App;

    beforeAll(async(): Promise<void> => {
      // Calculate the allowed quota depending on file system used
      const folderSizeTest = await fsPromises.stat(process.cwd());
      const size = (folderSizeTest.size * 6) + 6000;

      const instances = await instantiateFromConfig(
        'urn:solid-server:test:Instances',
        getTestConfigPath('quota-global.json'),
        {
          ...getDefaultVariables(port, baseUrl),
          'urn:solid-server:default:variable:rootFilePath': rootFilePath,
          'urn:solid-server:default:variable:GlobalQuota': size,
        },
      ) as Record<string, any>;
      ({ app } = instances);
      await app.start();

      // Initialize 2 pods
      await registerTestPods(baseUrl);
    });

    afterAll(async(): Promise<void> => {
      await app.stop();
      await removeFolder(rootFilePath);
    });

    it('should return 413 when global quota is exceeded.', async(): Promise<void> => {
      const testFile1 = `${baseUrl}test1.txt`;
      const testFile2 = `${baseUrl}test2.txt`;

      const response1 = performSimplePutWithLength(testFile1, 500);
      await expect(response1).resolves.toBeDefined();
      expect((await response1).status).toEqual(201);

      const response2 = performSimplePutWithLength(testFile2, 8000);
      await expect(response2).resolves.toBeDefined();
      expect((await response2).status).toEqual(413);
    });

    it('should return 413 when trying to write to any pod when global quota is exceeded.', async(): Promise<void> => {
      const testFile1 = `${baseUrl}abel/test3.txt`;
      const testFile2 = `${baseUrl}arthur/profile/test4.txt`;

      const response1 = performSimplePutWithLength(testFile1, 8000);
      await expect(response1).resolves.toBeDefined();
      expect((await response1).status).toEqual(413);

      const response2 = performSimplePutWithLength(testFile2, 8000);
      await expect(response2).resolves.toBeDefined();
      // eslint-disable-next-line no-console
      console.log(await response2);
      expect((await response2).status).toEqual(413);
    });
  });
});
