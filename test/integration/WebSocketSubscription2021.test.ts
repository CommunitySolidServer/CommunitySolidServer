import { fetch } from 'cross-fetch';
import type { NamedNode } from 'n3';
import { DataFactory, Parser, Store } from 'n3';
import { WebSocket } from 'ws';
import { BasicRepresentation } from '../../src/http/representation/BasicRepresentation';
import type { App } from '../../src/init/App';
import type { ResourceStore } from '../../src/storage/ResourceStore';
import { joinUrl } from '../../src/util/PathUtil';
import { NOTIFY, RDF } from '../../src/util/Vocabularies';
import { expectNotification, subscribe } from '../util/NotificationUtil';
import { getPort } from '../util/Util';
import {
  getDefaultVariables,
  getPresetConfigPath,
  getTestConfigPath,
  getTestFolder,
  instantiateFromConfig,
  removeFolder,
} from './Config';
import quad = DataFactory.quad;
import namedNode = DataFactory.namedNode;

const port = getPort('WebSocketSubscription2021');
const baseUrl = `http://localhost:${port}/`;
const notificationType = NOTIFY.WebSocketSubscription2021;

const rootFilePath = getTestFolder('WebSocketSubscription2021');
const stores: [string, any][] = [
  [ 'in-memory storage', {
    configs: [ 'storage/backend/memory.json', 'util/resource-locker/memory.json' ],
    teardown: jest.fn(),
  }],
  [ 'on-disk storage', {
  // Switch to file locker after https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1452
    configs: [ 'storage/backend/file.json', 'util/resource-locker/memory.json' ],
    teardown: async(): Promise<void> => removeFolder(rootFilePath),
  }],
];

describe.each(stores)('A server supporting WebSocketSubscription2021 using %s', (name, { configs, teardown }): void => {
  let app: App;
  let store: ResourceStore;
  const webId = 'http://example.com/card/#me';
  const topic = joinUrl(baseUrl, '/foo');
  let storageDescriptionUrl: string;
  let subscriptionUrl: string;
  let webSocketUrl: string;

  beforeAll(async(): Promise<void> => {
    const variables = {
      ...getDefaultVariables(port, baseUrl),
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };

    // Create and start the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        ...configs.map(getPresetConfigPath),
        getTestConfigPath('websocket-notifications.json'),
      ],
      variables,
    ) as Record<string, any>;
    ({ app, store } = instances);

    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await teardown();
    await app.stop();
  });

  it('links to the storage description.', async(): Promise<void> => {
    const response = await fetch(baseUrl);
    expect(response.status).toBe(200);
    const linkHeader = response.headers.get('link');
    expect(linkHeader).not.toBeNull();
    const match = /<([^>]+)>; rel="http:\/\/www\.w3\.org\/ns\/solid\/terms#storageDescription"/u.exec(linkHeader!);
    expect(match).not.toBeNull();
    storageDescriptionUrl = match![1];
  });

  it('exposes metadata on how to subscribe in the storage description.', async(): Promise<void> => {
    const response = await fetch(storageDescriptionUrl, { headers: { accept: 'text/turtle' }});
    expect(response.status).toBe(200);
    const quads = new Store(new Parser().parse(await response.text()));

    // Find the notification channel for websockets
    const subscriptions = quads.getObjects(storageDescriptionUrl, NOTIFY.terms.subscription, null);
    const websocketSubscriptions = subscriptions.filter((channel): boolean => quads.has(
      quad(channel as NamedNode, NOTIFY.terms.channelType, namedNode(`${NOTIFY.namespace}WebSocketSubscription2021`)),
    ));
    expect(websocketSubscriptions).toHaveLength(1);
    subscriptionUrl = websocketSubscriptions[0].value;
  });

  it('supports subscribing.', async(): Promise<void> => {
    const response = await subscribe(notificationType, webId, subscriptionUrl, topic);
    webSocketUrl = (response as any).source;
  });

  it('emits Created events.', async(): Promise<void> => {
    const socket = new WebSocket(webSocketUrl);

    const notificationPromise = new Promise<Buffer>((resolve): any => socket.on('message', resolve));
    await new Promise<void>((resolve): any => socket.on('open', resolve));

    const response = await fetch(topic, {
      method: 'PUT',
      headers: { 'content-type': 'text/plain' },
      body: 'abc',
    });
    expect(response.status).toBe(201);

    const notification = JSON.parse((await notificationPromise).toString());
    socket.close();

    expectNotification(notification, topic, 'Create');
  });

  it('emits Update events.', async(): Promise<void> => {
    const socket = new WebSocket(webSocketUrl);
    const notificationPromise = new Promise<Buffer>((resolve): any => socket.on('message', resolve));
    await new Promise<void>((resolve): any => socket.on('open', resolve));

    const response = await fetch(topic, {
      method: 'PUT',
      headers: { 'content-type': 'text/plain' },
      body: 'def',
    });
    expect(response.status).toBe(205);

    const notification = JSON.parse((await notificationPromise).toString());
    socket.close();

    expectNotification(notification, topic, 'Update');
  });

  it('emits Delete events.', async(): Promise<void> => {
    const socket = new WebSocket(webSocketUrl);
    const notificationPromise = new Promise<Buffer>((resolve): any => socket.on('message', resolve));
    await new Promise<void>((resolve): any => socket.on('open', resolve));

    const response = await fetch(topic, { method: 'DELETE' });
    expect(response.status).toBe(205);

    const notification = JSON.parse((await notificationPromise).toString());
    socket.close();

    expectNotification(notification, topic, 'Delete');
  });

  it('prevents subscribing to restricted resources.', async(): Promise<void> => {
    const restricted = joinUrl(baseUrl, '/restricted');

    // Only allow our WebID to read
    const restrictedAcl = `@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.

<#authorization>
    a               acl:Authorization;
    acl:agent       <${webId}>;
    acl:mode        acl:Read;
    acl:accessTo    <./restricted>.`;
    await store.setRepresentation({ path: `${restricted}.acl` }, new BasicRepresentation(restrictedAcl, 'text/turtle'));

    const channel = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      type: NOTIFY.WebSocketSubscription2021,
      topic: restricted,
    };

    // Unauthenticated fetch fails
    let response = await fetch(subscriptionUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/ld+json' },
      body: JSON.stringify(channel),
    });
    expect(response.status).toBe(401);

    // (debug) Authenticated fetch succeeds
    response = await fetch(subscriptionUrl, {
      method: 'POST',
      headers: {
        authorization: `WebID ${webId}`,
        'content-type': 'application/ld+json',
      },
      body: JSON.stringify(channel),
    });
    expect(response.status).toBe(200);
  });

  it('sends a notification if a state value was sent along.', async(): Promise<void> => {
    const response = await fetch(topic, {
      method: 'PUT',
      headers: { 'content-type': 'text/plain' },
      body: 'abc',
    });
    expect(response.status).toBe(201);

    const { source } = await subscribe(notificationType, webId, subscriptionUrl, topic, { state: 'abc' }) as any;

    const socket = new WebSocket(source);
    const notificationPromise = new Promise<Buffer>((resolve): any => socket.on('message', resolve));
    await new Promise<void>((resolve): any => socket.on('open', resolve));

    // Will receive a notification even though the resource did not change after the socket was open
    const notification = JSON.parse((await notificationPromise).toString());
    socket.close();

    expectNotification(notification, topic, 'Update');
  });

  it('removes expired channels.', async(): Promise<void> => {
    const { source } =
      await subscribe(notificationType, webId, subscriptionUrl, topic, { endAt: '1988-03-09T14:48:00.000Z' }) as any;

    const socket = new WebSocket(source);
    const messagePromise = new Promise<Buffer>((resolve): any => socket.on('message', resolve));
    await new Promise<void>((resolve): any => socket.on('close', resolve));

    const message = (await messagePromise).toString();
    expect(message).toBe('Notification channel has expired');
  });

  it('can use other RDF formats and content negotiation when creating a channel.', async(): Promise<void> => {
    const turtleChannel = `
      _:id <${RDF.type}> <${notificationType}> ;
           <http://www.w3.org/ns/solid/notifications#topic> <${topic}>.
    `;

    const response = await fetch(subscriptionUrl, {
      method: 'POST',
      headers: {
        authorization: `WebID ${webId}`,
        'content-type': 'text/turtle',
        accept: 'text/turtle',
      },
      body: turtleChannel,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/turtle');

    const parser = new Parser({ baseIRI: subscriptionUrl });
    const quads = new Store(parser.parse(await response.text()));

    expect(quads.getObjects(null, RDF.terms.type, null)).toEqual([ NOTIFY.terms.WebSocketSubscription2021 ]);
    expect(quads.getObjects(null, NOTIFY.terms.topic, null)).toEqual([ namedNode(topic) ]);
  });
});
