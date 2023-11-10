import { mkdirSync } from 'node:fs';
import fetch from 'cross-fetch';
import type { App } from '../../src/init/App';
import { joinFilePath } from '../../src/util/PathUtil';
import { register } from '../util/AccountUtil';
import type { User } from '../util/AccountUtil';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, getTestFolder, instantiateFromConfig, removeFolder } from './Config';

const port = getPort('DynamicPods');
const baseUrl = `http://localhost:${port}/`;
const rootFilePath = getTestFolder('dynamicPods');
const podConfigJson = joinFilePath(rootFilePath, 'config-pod.json');

const configs: [string, any][] = [
  [ 'memory.json', {
  // Need to remove the config-pod.json
    teardown: async(): Promise<void> => removeFolder(rootFilePath),
  }],
  [ 'filesystem.json', {
    teardown: async(): Promise<void> => removeFolder(rootFilePath),
  }],
];

// Using the actual templates instead of specific test ones to prevent a lot of duplication
// Tests are very similar to subdomain/pod tests. Would be nice if they can be combined
describe.each(configs)('A dynamic pod server with template config %s', (template, { teardown }): void => {
  let app: App;
  const user: User = {
    podName: 'alice',
    webId: 'http://example.com/#alice',
    email: 'alice@test.email',
    password: 'password',
    settings: {
      template,
    },
  };
  const podUrl = `${baseUrl}${user.podName}/`;
  let controls: any;
  let authorization: string;

  beforeAll(async(): Promise<void> => {
    const variables: Record<string, any> = {
      ...getDefaultVariables(port, baseUrl),
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
      'urn:solid-server:default:variable:podConfigJson': podConfigJson,
    };

    // Need to make sure the temp folder exists so the podConfigJson can be written to it
    mkdirSync(rootFilePath, { recursive: true });

    // Create and start the HTTP handler and related components
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      getTestConfigPath('server-dynamic-unsafe.json'),
      variables,
    ) as Record<string, any>;
    ({ app } = instances);

    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await teardown();
    await app.stop();
  });

  it('creates a pod with the given config.', async(): Promise<void> => {
    const result = await register(baseUrl, user);
    ({ controls, authorization } = result);
    expect(result.pod).toBe(podUrl);
  });

  it('can fetch the created pod.', async(): Promise<void> => {
    const res = await fetch(podUrl);
    expect(res.status).toBe(200);
  });

  it('should not be able to read the acl file.', async(): Promise<void> => {
    const res = await fetch(`${podUrl}.acl`);
    expect(res.status).toBe(401);
  });

  it('should be able to read acl file with the correct credentials.', async(): Promise<void> => {
    const res = await fetch(`${podUrl}.acl`, {
      headers: {
        authorization: `WebID ${user.webId}`,
      },
    });
    expect(res.status).toBe(200);
  });

  it('should be able to write to the pod now as the owner.', async(): Promise<void> => {
    let res = await fetch(`${podUrl}test`, {
      headers: {
        authorization: `WebID ${user.webId}`,
      },
    });
    expect(res.status).toBe(404);

    res = await fetch(`${podUrl}test`, {
      method: 'PUT',
      headers: {
        authorization: `WebID ${user.webId}`,
        'content-type': 'text/plain',
      },
      body: 'this is new data!',
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(`${podUrl}test`);

    res = await fetch(`${podUrl}test`, {
      headers: {
        authorization: `WebID ${user.webId}`,
      },
    });
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe('this is new data!');
  });

  it('should not be able to create a pod with the same name.', async(): Promise<void> => {
    const res = await fetch(controls.account.pod, {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify({ name: user.podName, settings: { template }}),
    });
    expect(res.status).toBe(400);
    await expect(res.text()).resolves.toContain(`There already is a pod at ${podUrl}`);
  });
});
