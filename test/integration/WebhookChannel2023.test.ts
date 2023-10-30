import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { fetch } from 'cross-fetch';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { NamedNode } from 'n3';
import { DataFactory, Parser, Store } from 'n3';
import type { App } from '../../src/init/App';
import { matchesAuthorizationScheme } from '../../src/util/HeaderUtil';
import { joinUrl, trimTrailingSlashes } from '../../src/util/PathUtil';
import { readJsonStream } from '../../src/util/StreamUtil';
import { NOTIFY } from '../../src/util/Vocabularies';
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

const port = getPort('WebhookChannel2023');
const baseUrl = `http://localhost:${port}/`;
const clientPort = getPort('WebhookChannel2023-client');
const target = `http://localhost:${clientPort}/`;
const webId = 'http://example.com/card/#me';
const notificationType = NOTIFY.WebhookChannel2023;

const rootFilePath = getTestFolder('WebhookChannel2023');
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

describe.each(stores)('A server supporting WebhookChannel2023 using %s', (name, { configs, teardown }): void => {
  let app: App;
  const topic = joinUrl(baseUrl, '/foo');
  let storageDescriptionUrl: string;
  let subscriptionUrl: string;
  let clientServer: Server;
  let serverWebId: string;

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
        getTestConfigPath('webhook-notifications.json'),
      ],
      variables,
    ) as Record<string, any>;
    ({ app } = instances);

    await app.start();

    // Start client server
    clientServer = createServer();
    clientServer.listen(clientPort);
  });

  afterAll(async(): Promise<void> => {
    clientServer.close();
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
    const subscriptions = quads.getObjects(null, NOTIFY.terms.subscription, null);
    const webhookSubscriptions = subscriptions.filter((channel): boolean => quads.has(
      quad(channel as NamedNode, NOTIFY.terms.channelType, NOTIFY.terms.WebhookChannel2023),
    ));
    expect(webhookSubscriptions).toHaveLength(1);
    subscriptionUrl = webhookSubscriptions[0].value;
  });

  it('supports subscribing.', async(): Promise<void> => {
    const { sender } =
      await subscribe(notificationType, webId, subscriptionUrl, topic, { [NOTIFY.sendTo]: target }) as any;
    serverWebId = sender;
  });

  it('emits Created events.', async(): Promise<void> => {
    const clientPromise = new Promise<{ request: IncomingMessage; response: ServerResponse }>((resolve): void => {
      clientServer.on('request', (request, response): void => {
        resolve({ request, response });
      });
    });

    let res = await fetch(topic, {
      method: 'PUT',
      headers: { 'content-type': 'text/plain' },
      body: 'abc',
    });
    expect(res.status).toBe(201);

    const { request, response } = await clientPromise;
    expect(request.headers['content-type']).toBe('application/ld+json');
    const notification = await readJsonStream(request);

    expectNotification(notification, topic, 'Create');

    // Find the JWKS of the server
    res = await fetch(joinUrl(baseUrl, '.well-known/openid-configuration'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const resJson = await res.json();
    expect(typeof resJson.jwks_uri).toBe('string');
    const jwks = createRemoteJWKSet(new URL(resJson.jwks_uri));

    // Check validity of DPoP headers
    // Note that this is not a comprehensive validation of the headers,
    // only some of the basics are checked.
    const { authorization, dpop } = request.headers;
    expect(matchesAuthorizationScheme('DPoP', authorization)).toBe(true);
    const encodedDpopToken = authorization!.slice('dpop '.length);
    // These will throw if they can not be decoded with the JWKS from the server
    const decodedDpopToken = await jwtVerify(encodedDpopToken, jwks, { issuer: trimTrailingSlashes(baseUrl) });
    expect(decodedDpopToken.payload).toMatchObject({
      webid: serverWebId,
    });
    const decodedDpopProof = await jwtVerify(dpop as string, jwks);
    expect(decodedDpopProof.payload).toMatchObject({
      htu: target,
      htm: 'POST',
    });

    // Close the connection so the server can shut down
    response.end();
  });

  it('sends a notification if a state value was sent along.', async(): Promise<void> => {
    const clientPromise = new Promise<{ request: IncomingMessage; response: ServerResponse }>((resolve): void => {
      clientServer.on('request', (request, response): void => {
        resolve({ request, response });
      });
    });

    await subscribe(notificationType, webId, subscriptionUrl, topic, { [NOTIFY.sendTo]: target, state: 'abc' });

    // Will resolve even though the resource did not change since subscribing
    const { request, response } = await clientPromise;
    expect(request.headers['content-type']).toBe('application/ld+json');
    const notification = await readJsonStream(request);

    expectNotification(notification, topic, 'Update');

    // Close the connection so the server can shut down
    response.end();
  });

  it('can remove notification channels.', async(): Promise<void> => {
    const { id } = await subscribe(notificationType, webId, subscriptionUrl, topic, { [NOTIFY.sendTo]: target }) as any;

    const response = await fetch(id, { method: 'DELETE' });
    expect(response.status).toBe(205);

    // Expired WebSockets only get removed every hour so not feasible to test in integration test
  });
});
