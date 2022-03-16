import fetch from 'cross-fetch';
import type { App } from '../../src/init/App';
import { register } from '../util/AccountUtil';
import type { User } from '../util/AccountUtil';
import { getPort } from '../util/Util';
import {
  getDefaultVariables,
  getPresetConfigPath,
  getTestConfigPath,
  getTestFolder,
  instantiateFromConfig,
  removeFolder,
} from './Config';

const port = getPort('Subdomains');
const baseUrl = `http://localhost:${port}/`;

const rootFilePath = getTestFolder('subdomains');
const stores: [string, any][] = [
  [ 'in-memory storage', {
    storeConfig: 'storage/backend/memory.json',
    teardown: jest.fn(),
  }],
  [ 'on-disk storage', {
    storeConfig: 'storage/backend/file.json',
    teardown: async(): Promise<void> => removeFolder(rootFilePath),
  }],
];

// Simulating subdomains using the forwarded header so no DNS changes are required
describe.each(stores)('A subdomain server with %s', (name, { storeConfig, teardown }): void => {
  let app: App;
  const user: User = {
    email: 'alice@example.com',
    password: 'password',
    webId: 'http://example.com/#alice',
    podName: 'alice',
  };
  const podHost = `alice.localhost:${port}`;
  const podUrl = `http://${podHost}/`;
  let authorization: string;
  let controls: any;

  beforeAll(async(): Promise<void> => {
    const variables: Record<string, any> = {
      ...getDefaultVariables(port, baseUrl),
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };

    // Create and start the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        getPresetConfigPath(storeConfig),
        getTestConfigPath('server-subdomains-unsafe.json'),
      ],
      variables,
    ) as Record<string, any>;
    ({ app } = instances);

    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await teardown();
    await app.stop();
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
          authorization: `WebID ${user.webId}`,
          'content-type': 'text/plain',
        },
        body: 'this is new data!',
      });
      expect(res.status).toBe(201);
      expect(res.headers.get('location')).toBe(`${baseUrl}alice`);

      res = await fetch(`${baseUrl}alice`);
      expect(res.status).toBe(200);
      await expect(res.text()).resolves.toBe('this is new data!');
    });
  });

  describe('handling pods', (): void => {
    it('creates pods in a subdomain.', async(): Promise<void> => {
      const result = await register(baseUrl, user);
      ({ controls, authorization } = result);
      expect(result.pod).toBe(podUrl);
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
          authorization: `WebID ${user.webId}`,
        },
      });
      expect(res.status).toBe(200);
    });

    it('should be able to write to the pod now as the owner.', async(): Promise<void> => {
      let res = await fetch(`${baseUrl}alice`, {
        headers: {
          forwarded: `host=${podHost}`,
          authorization: `WebID ${user.webId}`,
        },
      });
      expect(res.status).toBe(404);

      res = await fetch(`${baseUrl}alice`, {
        method: 'PUT',
        headers: {
          forwarded: `host=${podHost}`,
          authorization: `WebID ${user.webId}`,
          'content-type': 'text/plain',
        },
        body: 'this is new data!',
      });
      expect(res.status).toBe(201);
      expect(res.headers.get('location')).toBe(`${podUrl}alice`);

      res = await fetch(`${baseUrl}alice`, {
        headers: {
          forwarded: `host=${podHost}`,
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
        body: JSON.stringify({ name: user.podName }),
      });
      expect(res.status).toBe(400);
      await expect(res.text()).resolves.toContain(`There already is a resource at ${podUrl}`);
    });
  });
});
