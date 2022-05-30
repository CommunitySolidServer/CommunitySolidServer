import fetch from 'cross-fetch';
import { outputJson } from 'fs-extra';
import type { App } from '../../src/init/App';
import { joinFilePath, joinUrl } from '../../src/util/PathUtil';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, getTestFolder, instantiateFromConfig, removeFolder } from './Config';

const port = getPort('SeedingPods');
const baseUrl = `http://localhost:${port}/`;

const rootFilePath = getTestFolder('seeding-pods');

describe('A server with seeded pods', (): void => {
  const seedingJson = joinFilePath(rootFilePath, 'pods.json');
  let app: App;

  beforeAll(async(): Promise<void> => {
    // Create seeding config
    await outputJson(seedingJson, [
      {
        podName: 'alice',
        email: 'alice@example.com',
        password: 'alice-password',
      },
      {
        podName: 'bob',
        email: 'bob@example.com',
        password: 'bob-password',
        register: false,
      },
    ]);

    const variables = {
      ...getDefaultVariables(port, baseUrl),
      'urn:solid-server:default:variable:seededPodConfigJson': seedingJson,
    };

    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      getTestConfigPath('server-memory.json'),
      variables,
    ) as Record<string, any>;
    ({ app } = instances);
    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
    await removeFolder(rootFilePath);
  });

  it('has created the requested pods.', async(): Promise<void> => {
    let response = await fetch(joinUrl(baseUrl, 'alice/profile/card#me'));
    expect(response.status).toBe(200);
    response = await fetch(joinUrl(baseUrl, 'bob/profile/card#me'));
    expect(response.status).toBe(200);
  });
});
