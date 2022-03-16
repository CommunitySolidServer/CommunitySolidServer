import fetch from 'cross-fetch';
import { ensureFile, writeJson } from 'fs-extra';
import type { App } from '../../src/init/App';
import { joinFilePath, joinUrl } from '../../src/util/PathUtil';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, getTestFolder, instantiateFromConfig, removeFolder } from './Config';

const port = getPort('SeedingPods');
const baseUrl = `http://localhost:${port}/`;

const rootFilePath = getTestFolder('seeding-pods');

describe('A server with seeded pods', (): void => {
  const indexUrl = joinUrl(baseUrl, '.account/');
  let app: App;

  beforeAll(async(): Promise<void> => {
    // Create the seed file
    const seed = [
      {
        email: 'test1@example.com',
        password: 'password1',
        pods: [
          { name: 'pod1' },
          { name: 'pod2' },
        ],
      },
      {
        email: 'test2@example.com',
        password: 'password2',
        pods: [
          { name: 'pod3' },
          // This will fail
          { name: 'pod2' },
        ],
      },
      {
        // This will all fail
        email: 'test1@example.com',
        password: 'password3',
        pods: [
          { name: 'pod4' },
        ],
      },
    ];
    const path = joinFilePath(rootFilePath, 'seed.json');
    await ensureFile(path);
    await writeJson(path, seed);

    // Start server with the seed config
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      getTestConfigPath('server-memory.json'),
      {
        ...getDefaultVariables(port, baseUrl),
        'urn:solid-server:default:variable:seedConfig': path,
      },
    ) as Record<string, any>;
    ({ app } = instances);
    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await removeFolder(rootFilePath);
    await app.stop();
  });

  it('can seed accounts and pods.', async(): Promise<void> => {
    // Get the controls
    const res = await fetch(indexUrl);
    expect(res.status).toBe(200);
    const { controls } = await res.json();

    // Verify that the pods exists
    await expect(fetch(joinUrl(baseUrl, 'pod1/'))).resolves.toEqual(expect.objectContaining({ status: 200 }));
    await expect(fetch(joinUrl(baseUrl, 'pod2/'))).resolves.toEqual(expect.objectContaining({ status: 200 }));
    await expect(fetch(joinUrl(baseUrl, 'pod3/'))).resolves.toEqual(expect.objectContaining({ status: 200 }));
    await expect(fetch(joinUrl(baseUrl, 'pod4/'))).resolves.toEqual(expect.objectContaining({ status: 404 }));

    // Verify that we can log in with the accounts
    await expect(fetch(controls.password.login, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test1@example.com', password: 'password1' }),
    })).resolves.toEqual(expect.objectContaining({ status: 200 }));
    await expect(fetch(controls.password.login, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test2@example.com', password: 'password2' }),
    })).resolves.toEqual(expect.objectContaining({ status: 200 }));
    await expect(fetch(controls.password.login, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test1@example.com', password: 'password3' }),
    })).resolves.toEqual(expect.objectContaining({ status: 403 }));
  });
});
