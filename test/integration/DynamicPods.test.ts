import { mkdirSync } from 'fs';
import type { Server } from 'http';
import { stringify } from 'querystring';
import fetch from 'cross-fetch';
import type { Initializer } from '../../src/init/Initializer';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import type { WrappedExpiringStorage } from '../../src/storage/keyvalue/WrappedExpiringStorage';
import { joinFilePath } from '../../src/util/PathUtil';
import { getPort } from '../util/Util';
import { getTestConfigPath, getTestFolder, instantiateFromConfig, removeFolder } from './Config';

const port = getPort('DynamicPods');
const baseUrl = `http://localhost:${port}/`;
const rootFilePath = getTestFolder('dynamicPods');
const podConfigJson = joinFilePath(rootFilePath, 'config-pod.json');

const configs: [string, any][] = [
  [ 'memory.json', {
    teardown: (): void => removeFolder(rootFilePath),
  }],
  [ 'filesystem.json', {
    teardown: (): void => removeFolder(rootFilePath),
  }],
];

// Using the actual templates instead of specific test ones to prevent a lot of duplication
// Tests are very similar to subdomain/pod tests. Would be nice if they can be combined
describe.each(configs)('A dynamic pod server with template config %s', (template, { teardown }): void => {
  let server: Server;
  let initializer: Initializer;
  let factory: HttpServerFactory;
  let expiringStorage: WrappedExpiringStorage<any, any>;
  const settings = { podName: 'alice', webId: 'http://test.com/#alice', email: 'alice@test.email', template, createPod: true };
  const podUrl = `${baseUrl}${settings.podName}/`;

  beforeAll(async(): Promise<void> => {
    const variables: Record<string, any> = {
      'urn:solid-server:default:variable:baseUrl': baseUrl,
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
      'urn:solid-server:default:variable:podConfigJson': podConfigJson,
      'urn:solid-server:default:variable:idpTemplateFolder': joinFilePath(__dirname, '../../templates/idp'),
    };

    // Need to make sure the temp folder exists so the podConfigJson can be written to it
    mkdirSync(rootFilePath, { recursive: true });

    // Create and initialize the HTTP handler and related components
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      getTestConfigPath('server-dynamic-unsafe.json'),
      variables,
    ) as Record<string, any>;
    ({ factory, initializer, expiringStorage } = instances);

    // Set up the internal store
    await initializer.handleSafe();

    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    expiringStorage.finalize();
    await new Promise((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
    await teardown();
  });

  it('creates a pod with the given config.', async(): Promise<void> => {
    const res = await fetch(`${baseUrl}idp/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: stringify(settings),
    });
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain(podUrl);
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
        authorization: `WebID ${settings.webId}`,
      },
    });
    expect(res.status).toBe(200);
  });

  it('should be able to write to the pod now as the owner.', async(): Promise<void> => {
    let res = await fetch(`${podUrl}test`, {
      headers: {
        authorization: `WebID ${settings.webId}`,
      },
    });
    expect(res.status).toBe(404);

    res = await fetch(`${podUrl}test`, {
      method: 'PUT',
      headers: {
        authorization: `WebID ${settings.webId}`,
        'content-type': 'text/plain',
      },
      body: 'this is new data!',
    });
    expect(res.status).toBe(205);

    res = await fetch(`${podUrl}test`, {
      headers: {
        authorization: `WebID ${settings.webId}`,
      },
    });
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe('this is new data!');
  });

  it('should not be able to create a pod with the same name.', async(): Promise<void> => {
    const res = await fetch(`${baseUrl}idp/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: stringify(settings),
    });
    // 200 due to there only being a HTML solution right now that only returns 200
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain(`There already is a pod at ${podUrl}`);
  });
});
