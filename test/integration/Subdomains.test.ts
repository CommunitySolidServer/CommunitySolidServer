import type { Server } from 'http';
import fetch from 'cross-fetch';
import type { Initializer } from '../../src/init/Initializer';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { getPort } from '../util/Util';
import { getPresetConfigPath, getTestConfigPath, getTestFolder, instantiateFromConfig, removeFolder } from './Config';

const port = getPort('Subdomains');
const baseUrl = `http://localhost:${port}/`;

const rootFilePath = getTestFolder('subdomains');
const stores: [string, any][] = [
  [ 'in-memory storage', {
    storeConfig: 'storage/resource-store/memory.json',
    teardown: jest.fn(),
  }],
  [ 'on-disk storage', {
    storeConfig: 'storage/resource-store/file.json',
    teardown: (): void => removeFolder(rootFilePath),
  }],
];

// Simulating subdomains using the forwarded header so no DNS changes are required
describe.each(stores)('A subdomain server with %s', (name, { storeConfig, teardown }): void => {
  let server: Server;
  let initializer: Initializer;
  let factory: HttpServerFactory;
  const settings = { login: 'alice', webId: 'http://test.com/#alice', name: 'Alice Bob' };
  const podHost = `alice.localhost:${port}`;
  const podUrl = `http://${podHost}/`;

  beforeAll(async(): Promise<void> => {
    const variables: Record<string, any> = {
      'urn:solid-server:default:variable:port': port,
      'urn:solid-server:default:variable:baseUrl': baseUrl,
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };

    // Create and initialize the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        getPresetConfigPath(storeConfig),
        getTestConfigPath('server-subdomains-unsafe.json'),
      ],
      variables,
    ) as Record<string, any>;
    ({ factory, initializer } = instances);

    await initializer.handleSafe();
    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    await new Promise((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
    await teardown();
  });

  describe('handling resources', (): void => {
    it('can read the root container.', async(): Promise<void> => {
      const res = await fetch(baseUrl);
      expect(res.status).toBe(200);
    });

    it('can write resources.', async(): Promise<void> => {
      let res = await fetch(`${baseUrl}alice`, {
        method: 'PUT',
        headers: {
          authorization: `WebID ${settings.webId}`,
          'content-type': 'text/plain',
        },
        body: 'this is new data!',
      });
      expect(res.status).toBe(205);

      res = await fetch(`${baseUrl}alice`);
      expect(res.status).toBe(200);
      await expect(res.text()).resolves.toBe('this is new data!');
    });
  });

  describe('handling pods', (): void => {
    it('creates pods in a subdomain.', async(): Promise<void> => {
      const res = await fetch(`${baseUrl}pods`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      expect(res.status).toBe(201);
      expect(res.headers.get('location')).toBe(podUrl);
    });

    it('can fetch the created pod in a subdomain.', async(): Promise<void> => {
      const res = await fetch(baseUrl, { headers: { forwarded: `host=${podHost}` }});
      expect(res.status).toBe(200);
    });

    it('should not be able to read the acl file.', async(): Promise<void> => {
      const res = await fetch(`${baseUrl}.acl`, { headers: { forwarded: `host=${podHost}` }});
      expect(res.status).toBe(401);
    });

    it('should be able to read acl file with the correct credentials.', async(): Promise<void> => {
      const res = await fetch(`${baseUrl}.acl`, {
        headers: {
          forwarded: `host=${podHost}`,
          authorization: `WebID ${settings.webId}`,
        },
      });
      expect(res.status).toBe(200);
    });

    it('should be able to write to the pod now as the owner.', async(): Promise<void> => {
      let res = await fetch(`${baseUrl}alice`, {
        headers: {
          forwarded: `host=${podHost}`,
          authorization: `WebID ${settings.webId}`,
        },
      });
      expect(res.status).toBe(404);

      res = await fetch(`${baseUrl}alice`, {
        method: 'PUT',
        headers: {
          forwarded: `host=${podHost}`,
          authorization: `WebID ${settings.webId}`,
          'content-type': 'text/plain',
        },
        body: 'this is new data!',
      });
      expect(res.status).toBe(205);

      res = await fetch(`${baseUrl}alice`, {
        headers: {
          forwarded: `host=${podHost}`,
          authorization: `WebID ${settings.webId}`,
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
        body: JSON.stringify(settings),
      });
      expect(res.status).toBe(409);
    });
  });
});
