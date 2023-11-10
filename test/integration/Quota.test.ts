import type { Stats } from 'node:fs';
import fetch from 'cross-fetch';
import type { Response } from 'cross-fetch';
import { ensureDir, pathExists, stat } from 'fs-extra';
import { joinUrl } from '../../src';
import type { App } from '../../src';
import { register } from '../util/AccountUtil';
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
async function registerTestPods(baseUrl: string, pods: string[]): Promise<void> {
  for (const pod of pods) {
    await register(baseUrl, { podName: pod, email: `${pod}@example.ai`, password: 't' });
  }
}

describe('A quota server', (): void => {
  // The allowed quota depends on what filesystem/OS you are using.
  // For example: an empty folder is reported as
  //  - 0KB on NTFS (most of the time, mileage may vary)
  //  - 0-...KB on APFS (depending on its contents and settings)
  //  - 4O96KB on FAT
  // This is why we need to determine the size of a folder on the current system.
  let folderSizeTest: Stats;
  beforeAll(async(): Promise<void> => {
    // We want to use an empty folder as on APFS/Mac folder sizes vary a lot
    const tempFolder = getTestFolder('quota-temp');
    await ensureDir(tempFolder);
    folderSizeTest = await stat(tempFolder);
    await removeFolder(tempFolder);
  });
  const podName1 = 'arthur';
  const podName2 = 'abel';

  /** Test the general functionality of the server using pod quota */
  describe('with pod quota enabled', (): void => {
    const port = getPort('PodQuota');
    const baseUrl = `http://localhost:${port}/`;
    const pod1 = joinUrl(baseUrl, podName1);
    const pod2 = joinUrl(baseUrl, podName2);
    const rootFilePath = getTestFolder('quota-pod');

    let app: App;

    beforeAll(async(): Promise<void> => {
      // Calculate the allowed quota depending on file system used
      const size = folderSizeTest.size + 4000;

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
      await registerTestPods(baseUrl, [ podName1, podName2 ]);
    });

    afterAll(async(): Promise<void> => {
      // Not cleaning up `rootFilePath` as this intermittently causes issues during CI
      await app.stop();
    });

    // Test quota in the first pod
    it('should return a 413 when the quota is exceeded during write.', async(): Promise<void> => {
      const testFile1 = `${pod1}/test1.txt`;
      const testFile2 = `${pod1}/test2.txt`;

      const response1 = performSimplePutWithLength(testFile1, 2000);
      await expect(response1).resolves.toBeDefined();
      expect((await response1).status).toBe(201);

      const response2 = performSimplePutWithLength(testFile2, 2500);
      await expect(response2).resolves.toBeDefined();
      expect((await response2).status).toBe(413);
    });

    // Test if writing in another pod is still possible
    it('should allow writing in a pod that is not full yet.', async(): Promise<void> => {
      const testFile1 = `${pod2}/test1.txt`;

      const response1 = performSimplePutWithLength(testFile1, 2000);
      await expect(response1).resolves.toBeDefined();
      expect((await response1).status).toBe(201);
    });

    // Both pods should not accept this request anymore
    it('should block PUT requests to different pods if their quota is exceeded.', async(): Promise<void> => {
      const testFile1 = `${pod1}/test2.txt`;
      const testFile2 = `${pod2}/test2.txt`;

      const response1 = performSimplePutWithLength(testFile1, 2500);
      await expect(response1).resolves.toBeDefined();
      expect((await response1).status).toBe(413);

      const response2 = performSimplePutWithLength(testFile2, 2500);
      await expect(response2).resolves.toBeDefined();
      expect((await response2).status).toBe(413);
    });

    it(
      'should not generate metadata files (the only possible entry content-length is removed after quota validation).',
      async(): Promise<void> => {
        const testFile3 = `${pod1}/test3.txt`;
        const response1 = performSimplePutWithLength(testFile3, 100);
        await expect(response1).resolves.toBeDefined();
        expect((await response1).status).toBe(201);

        // Validate that a meta file was not created
        const check = await pathExists(`${rootFilePath}/${podName1}/test3.txt.meta`);
        expect(check).toBe(false);
      },
    );
  });

  /** Test the general functionality of the server using global quota */
  describe('with global quota enabled', (): void => {
    const port = getPort('GlobalQuota');
    const baseUrl = `http://localhost:${port}/`;
    const pod1 = `${baseUrl}${podName1}`;
    const pod2 = `${baseUrl}${podName2}`;
    const rootFilePath = getTestFolder('quota-global');

    let app: App;

    beforeAll(async(): Promise<void> => {
      // Calculate the allowed quota depending on file system used
      const size = (folderSizeTest.size * 3) + 4000;

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
      await registerTestPods(baseUrl, [ podName1, podName2 ]);
    });

    afterAll(async(): Promise<void> => {
      // Not cleaning up `rootFilePath` as this intermittently causes issues during CI
      await app.stop();
    });

    it('should return 413 when global quota is exceeded.', async(): Promise<void> => {
      const testFile1 = `${baseUrl}test1.txt`;
      const testFile2 = `${baseUrl}test2.txt`;

      const response1 = performSimplePutWithLength(testFile1, 2000);
      await expect(response1).resolves.toBeDefined();
      const awaitedRes1 = await response1;
      expect(awaitedRes1.status).toBe(201);

      const response2 = performSimplePutWithLength(testFile2, 2500);
      await expect(response2).resolves.toBeDefined();
      const awaitedRes2 = await response2;
      expect(awaitedRes2.status).toBe(413);
    });

    it('should return 413 when trying to write to any pod when global quota is exceeded.', async(): Promise<void> => {
      const testFile1 = `${pod1}/test3.txt`;
      const testFile2 = `${pod2}/test4.txt`;

      const response1 = performSimplePutWithLength(testFile1, 2500);
      await expect(response1).resolves.toBeDefined();
      const awaitedRes1 = await response1;
      expect(awaitedRes1.status).toBe(413);

      const response2 = performSimplePutWithLength(testFile2, 2500);
      await expect(response2).resolves.toBeDefined();
      const awaitedRes2 = await response2;
      expect(awaitedRes2.status).toBe(413);
    });

    it(
      'should not generate metadata files (the only possible entry content-length is removed after quota validation).',
      async(): Promise<void> => {
        const testFile3 = `${pod1}/test5.txt`;
        const response1 = performSimplePutWithLength(testFile3, 100);
        await expect(response1).resolves.toBeDefined();
        expect((await response1).status).toBe(201);

        // Validate that a meta file was not created
        const check = await pathExists(`${rootFilePath}/${podName1}/test5.txt.meta`);
        expect(check).toBe(false);
      },
    );
  });
});
