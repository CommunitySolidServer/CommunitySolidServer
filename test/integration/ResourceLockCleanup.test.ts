import fetch from 'cross-fetch';
import type { App, DataAccessorBasedStore, Initializable, ResourceLocker } from '../../src';
import { BasicRepresentation, readableToString } from '../../src';
import { describeIf, getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, getTestFolder, instantiateFromConfig, removeFolder } from './Config';

const port = getPort('ResourceLockCleanup');
const baseUrl = `http://localhost:${port}/`;
const rootFilePath = getTestFolder(`resource-lock-cleanup`);
const resourceIdentifier = { path: `${baseUrl}container1/test.txt` };

const configs: [string, any][] = [
  [
    'file-based',
    {
      config: 'server-file.json',
      init: async(initializable: Initializable): Promise<void> => initializable.initialize(),
      teardown: async(): Promise<void> => removeFolder(rootFilePath),
    },
  ],
  [
    'redis-based',
    {
      config: 'server-redis-lock.json',
      init: jest.fn(),
      teardown: jest.fn(),
    },
  ],
];

/* eslint-disable jest/require-top-level-describe, jest/consistent-test-it */
describeIf('docker').each(configs)('A server using %s locking', (id, { config, init, teardown }):
void => {
  let app: App;
  let store: DataAccessorBasedStore;
  let locker: ResourceLocker;

  beforeAll(async(): Promise<void> => {
    const variables = {
      ...getDefaultVariables(port, baseUrl),
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };

    // Create the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        getTestConfigPath(config),
      ],
      variables,
    ) as Record<string, any>;
    ({ app, store, locker } = instances);
    // Create the test resource
    await store.setRepresentation(resourceIdentifier, new BasicRepresentation('abc', 'text/plain'));

    // Perform additional initialization, if configured
    await init(locker);
  });

  afterAll(async(): Promise<void> => {
    await teardown();
    await app.stop();
  });

  it('should not be affected by dangling locks.', async(): Promise<void> => {
    // Simulate lock existing before server startup, by creating a (write) lock directly
    await locker.acquire({ path: `${resourceIdentifier.path}.write` });
    // Start the server
    await app.start();

    // Updating the resource should succeed (if the server clears dangling locks on startup).
    const updatedContent = 'def';
    const result = await fetch(resourceIdentifier.path, {
      method: 'PUT',
      headers: {
        'content-type': 'text/plain',
      },
      body: updatedContent,
    });
    expect(result.status).toBe(205);
    // Check if the resource was updated:
    const representation = await store.getRepresentation(resourceIdentifier);
    const data = await readableToString(representation.data);
    expect(data).toEqual(updatedContent);
  });
});
