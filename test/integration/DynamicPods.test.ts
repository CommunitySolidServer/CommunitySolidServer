import { mkdirSync } from 'fs';
import type { Server } from 'http';
import fetch from 'cross-fetch';
import type { Initializer } from '../../src/init/Initializer';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { joinFilePath } from '../../src/util/PathUtil';
import { getTestFolder, instantiateFromConfig, removeFolder } from './Config';

const port = 6006;
const baseUrl = `http://localhost:${port}/`;
const rootFilePath = getTestFolder('dynamicPods');
const podConfigJson = joinFilePath(rootFilePath, 'config-pod.json');

const configs: [string, any][] = [
  [ 'storage-memory.json', {
    teardown: (): void => removeFolder(rootFilePath),
  }],
  [ 'storage-filesystem.json', {
    teardown: (): void => removeFolder(rootFilePath),
  }],
];

// Using the actual templates instead of specific test ones to prevent a lot of duplication
// Tests are very similar to subdomain/pod tests. Would be nice if they can be combined
describe.each(configs)('A dynamic pod server with template config %s', (template, { teardown }): void => {
  let server: Server;
  let initializer: Initializer;
  let factory: HttpServerFactory;
  const agent = { login: 'alice', webId: 'http://test.com/#alice', name: 'Alice Bob', template };
  const podUrl = `${baseUrl}${agent.login}/`;

  beforeAll(async(): Promise<void> => {
    const variables: Record<string, any> = {
      'urn:solid-server:default:variable:baseUrl': baseUrl,
      'urn:solid-server:default:variable:port': port,
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
      'urn:solid-server:default:variable:podTemplateFolder': joinFilePath(__dirname, '../assets/templates'),
      'urn:solid-server:default:variable:podConfigJson': podConfigJson,
    };

    // Need to make sure the temp folder exists so the podConfigJson can be written to it
    mkdirSync(rootFilePath, { recursive: true });

    // Create and initialize the HTTP handler and related components
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      'server-dynamic-unsafe.json',
      variables,
    ) as Record<string, any>;
    ({ factory, initializer } = instances);

    // Set up the internal store
    await initializer.handleSafe();

    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    await new Promise((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
    await teardown();
  });

  it('creates a pod with the given config.', async(): Promise<void> => {
    const res = await fetch(`${baseUrl}pods`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(agent),
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(podUrl);
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
        authorization: `WebID ${agent.webId}`,
      },
    });
    expect(res.status).toBe(200);
  });

  it('should be able to write to the pod now as the owner.', async(): Promise<void> => {
    let res = await fetch(`${podUrl}test`, {
      headers: {
        authorization: `WebID ${agent.webId}`,
      },
    });
    expect(res.status).toBe(404);

    res = await fetch(`${podUrl}test`, {
      method: 'PUT',
      headers: {
        authorization: `WebID ${agent.webId}`,
        'content-type': 'text/plain',
      },
      body: 'this is new data!',
    });
    expect(res.status).toBe(205);

    res = await fetch(`${podUrl}test`, {
      headers: {
        authorization: `WebID ${agent.webId}`,
      },
    });
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe('this is new data!');
  });

  it('should not be able to create a pod with the same name.', async(): Promise<void> => {
    const res = await fetch(`${baseUrl}pods`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(agent),
    });
    expect(res.status).toBe(409);
  });
});
