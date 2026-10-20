import { fetch } from 'cross-fetch';
import type { App } from '../../src/init/App';
import type { ResourceStore } from '../../src/storage/ResourceStore';
import { joinUrl } from '../../src/util/PathUtil';
import { NOTIFY } from '../../src/util/Vocabularies';
import { subscribe } from '../util/NotificationUtil';
import { getPort } from '../util/Util';
import {
  getDefaultVariables,
  getPresetConfigPath,
  getTestConfigPath,
  getTestFolder,
  instantiateFromConfig,
  removeFolder,
} from './Config';

const port = getPort('NotificationChannelSweep');
const baseUrl = `http://localhost:${port}/`;
const webId = 'http://example.com/card/#me';

const rootFilePath = getTestFolder('NotificationChannelSweep');
const stores: [string, any][] = [
  [ 'in-memory storage', {
    configs: [ 'storage/backend/memory.json', 'util/resource-locker/memory.json' ],
    teardown: jest.fn(),
  }],
  [ 'on-disk storage', {
    configs: [ 'storage/backend/file.json', 'util/resource-locker/file.json' ],
    teardown: async(): Promise<void> => removeFolder(rootFilePath),
  }],
];

function toInternal(id: string): { path: string } {
  return { path: joinUrl(baseUrl, '.internal/notifications/', encodeURIComponent(id)) };
}

async function waitFor(check: () => Promise<boolean>, timeout = 10000): Promise<boolean> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) {
      return true;
    }
    await new Promise((resolve): unknown => setTimeout(resolve, 100));
  }
  return false;
}

describe.each(stores)('A server sweeping notification channels using %s', (name, { configs, teardown }): void => {
  let app: App;
  let store: ResourceStore;
  const topic = joinUrl(baseUrl, '/foo');
  const subscriptionUrl = joinUrl(baseUrl, '.notifications/WebhookChannel2023/');

  beforeAll(async(): Promise<void> => {
    const variables = {
      ...getDefaultVariables(port, baseUrl),
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };

    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        ...configs.map(getPresetConfigPath),
        getTestConfigPath('webhook-notifications.json'),
        getTestConfigPath('notification-sweep.json'),
      ],
      variables,
    ) as Record<string, any>;
    ({ app, store } = instances);

    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
    await teardown();
  });

  it('removes expired channels.', async(): Promise<void> => {
    const res = await fetch(topic, { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: 'abc' });
    expect(res.status).toBe(201);

    const { id: expiring } = await subscribe(NOTIFY.WebhookChannel2023, webId, subscriptionUrl, topic, {
      [NOTIFY.sendTo]: 'https://example.com/webhook',
      endAt: new Date(Date.now() + 1000).toISOString(),
    }) as { id: string };
    const { id: active } = await subscribe(NOTIFY.WebhookChannel2023, webId, subscriptionUrl, topic, {
      [NOTIFY.sendTo]: 'https://example.com/webhook',
    }) as { id: string };

    await expect(store.hasResource(toInternal(expiring))).resolves.toBe(true);
    await expect(store.hasResource(toInternal(active))).resolves.toBe(true);

    await expect(waitFor(async(): Promise<boolean> => !await store.hasResource(toInternal(expiring))))
      .resolves.toBe(true);
    await expect(store.hasResource(toInternal(active))).resolves.toBe(true);
  });
});
