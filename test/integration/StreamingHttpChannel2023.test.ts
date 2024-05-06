import { Agent, fetch } from 'undici';
import { DataFactory, Parser, Store } from 'n3';
import { BasicRepresentation } from '../../src/http/representation/BasicRepresentation';
import type { App } from '../../src/init/App';
import type { ResourceStore } from '../../src/storage/ResourceStore';
import { joinUrl } from '../../src/util/PathUtil';
import { AS, RDF } from '../../src/util/Vocabularies';
import { getPort } from '../util/Util';
import {
  getDefaultVariables,
  getPresetConfigPath,
  getTestConfigPath,
  getTestFolder,
  instantiateFromConfig,
  removeFolder,
} from './Config';
import namedNode = DataFactory.namedNode;

const port = getPort('StreamingHTTPChannel2023');
const baseUrl = `http://localhost:${port}/`;

const rootFilePath = getTestFolder('StreamingHTTPChannel2023');
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

describe.each(stores)('A server supporting StreamingHTTPChannel2023 using %s', (name, { configs, teardown }): void => {
  let app: App;
  let store: ResourceStore;
  const webId = 'http://example.com/card/#me';
  const topic = joinUrl(baseUrl, '/foo');
  const pathPrefix = '.notifications/StreamingHTTPChannel2023';
  const receiveFrom = joinUrl(baseUrl, pathPrefix, '/foo');

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
        getTestConfigPath('streaming-http-notifications.json'),
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

  it('advertises streaming http endpoint in Link header.', async(): Promise<void> => {
    await store.setRepresentation({ path: topic }, new BasicRepresentation('new', 'text/plain'));
    const response = await fetch(topic);
    expect(response.status).toBe(200);
    const linkHeader = response.headers.get('link');
    const match = /<([^>]+)>; rel="http:\/\/www\.w3\.org\/ns\/solid\/terms#updatesViaStreamingHttp2023"/u
      .exec(linkHeader!);
    expect(match![1]).toEqual(receiveFrom);
  });

  it.todo('only allows GET on receiveFrom endpoint.');

  it('emits initial Update if topic exists.', async(): Promise<void> => {
    await store.setRepresentation({ path: topic }, new BasicRepresentation('new', 'text/plain'));
    const streamingResponse = await fetch(receiveFrom, {
      dispatcher: new Agent({ bodyTimeout: 1000 }),
    });
    const reader = streamingResponse.body!.getReader();
    const decoder = new TextDecoder();
    const parser = new Parser();

    try {
      const notification = await reader.read().then(({ value }): string => decoder.decode(value));
      expect(notification).toBeDefined();

      const quads = new Store(parser.parse(notification));
      expect(quads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Update ]);
      expect(quads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(topic) ]);
    } finally {
      reader.releaseLock();
      await streamingResponse.body!.cancel();
    }
  });

  it('emits initial Delete if topic does not exist.', async(): Promise<void> => {
    try {
      await store.deleteResource({ path: topic });
    } catch {}
    const streamingResponse = await fetch(receiveFrom, {
      dispatcher: new Agent({ bodyTimeout: 1000 }),
    });
    const reader = streamingResponse.body!.getReader();
    const decoder = new TextDecoder();
    const parser = new Parser();

    try {
      const notification = await reader.read().then(({ value }): string => decoder.decode(value));
      expect(notification).toBeDefined();

      const quads = new Store(parser.parse(notification));
      expect(quads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Delete ]);
      expect(quads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(topic) ]);
    } finally {
      reader.releaseLock();
      await streamingResponse.body!.cancel();
    }
  });

  it.todo('does not emit initial notification when other receivers connect.');

  it('emits Create events.', async(): Promise<void> => {
    try {
      await store.deleteResource({ path: topic });
    } catch {}
    const streamingResponse = await fetch(receiveFrom, {
      dispatcher: new Agent({ bodyTimeout: 1000 }),
    });
    const reader = streamingResponse.body!.getReader();
    const decoder = new TextDecoder();
    const parser = new Parser();

    try {
      // Ignore initial notification
      await reader.read().then(({ value }): string => decoder.decode(value));

      // Create resource
      const response = await fetch(topic, {
        method: 'PUT',
        headers: { 'content-type': 'text/plain' },
        body: 'abc',
      });
      expect(response.status).toBe(201);

      const notification = await reader.read().then(({ value }): string => decoder.decode(value));
      expect(notification).toBeDefined();

      const quads = new Store(parser.parse(notification));

      expect(quads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Create ]);
      expect(quads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(topic) ]);
    } finally {
      reader.releaseLock();
      await streamingResponse.body!.cancel();
    }
  });

  it('emits Update events.', async(): Promise<void> => {
    await store.setRepresentation({ path: topic }, new BasicRepresentation('new', 'text/plain'));
    const streamingResponse = await fetch(receiveFrom, {
      dispatcher: new Agent({ bodyTimeout: 1000 }),
    });
    const reader = streamingResponse.body!.getReader();
    const decoder = new TextDecoder();
    const parser = new Parser();

    try {
      // Ignore initial notification
      await reader.read().then(({ value }): string => decoder.decode(value));

      // Update resource
      const response = await fetch(topic, {
        method: 'PUT',
        headers: { 'content-type': 'text/plain' },
        body: 'abc',
      });
      expect(response.status).toBe(205);

      const notification = await reader.read().then(({ value }): string => decoder.decode(value));
      expect(notification).toBeDefined();

      const quads = new Store(parser.parse(notification));

      expect(quads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Update ]);
      expect(quads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(topic) ]);
    } finally {
      reader.releaseLock();
      await streamingResponse.body!.cancel();
    }
  });

  it('emits Delete events.', async(): Promise<void> => {
    await store.setRepresentation({ path: topic }, new BasicRepresentation('new', 'text/plain'));
    const streamingResponse = await fetch(receiveFrom, {
      dispatcher: new Agent({ bodyTimeout: 1000 }),
    });
    const reader = streamingResponse.body!.getReader();
    const decoder = new TextDecoder();
    const parser = new Parser();

    try {
      // Ignore initial notification
      await reader.read().then(({ value }): string => decoder.decode(value));

      // Delete resource
      const response = await fetch(topic, {
        method: 'DELETE',
      });
      expect(response.status).toBe(205);

      const notification = await reader.read().then(({ value }): string => decoder.decode(value));
      expect(notification).toBeDefined();

      const quads = new Store(parser.parse(notification));

      expect(quads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Delete ]);
      expect(quads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(topic) ]);
    } finally {
      reader.releaseLock();
      await streamingResponse.body!.cancel();
    }
  });

  it('prevents connecting to channels of restricted topics.', async(): Promise<void> => {
    const restricted = joinUrl(baseUrl, '/restricted');
    const restrictedReceiveFrom = joinUrl(baseUrl, pathPrefix, '/restricted');
    await store.setRepresentation({ path: restricted }, new BasicRepresentation('new', 'text/plain'));

    // Only allow our WebID to read
    const restrictedAcl = `
      @prefix acl: <http://www.w3.org/ns/auth/acl#>.
      @prefix foaf: <http://xmlns.com/foaf/0.1/>.

      <#authorization>
          a               acl:Authorization;
          acl:agent       <${webId}>;
          acl:mode        acl:Read, acl:Write;
          acl:accessTo    <./restricted>.`;

    await store.setRepresentation({ path: `${restricted}.acl` }, new BasicRepresentation(restrictedAcl, 'text/turtle'));

    // Unauthenticated fetch fails
    const unauthenticatedResponse = await fetch(restrictedReceiveFrom);
    try {
      expect(unauthenticatedResponse.status).toBe(401);
    } finally {
      await unauthenticatedResponse.body?.cancel();
    }

    // Authenticated fetch succeeds
    const authenticatedResponse = await fetch(restrictedReceiveFrom, {
      headers: {
        authorization: `WebID ${webId}`,
      },
    });
    try {
      expect(authenticatedResponse.status).toBe(200);
    } finally {
      await authenticatedResponse.body!.cancel();
    }
  });

  it('emits container notifications if contents get added or removed.', async(): Promise<void> => {
    const resource = joinUrl(baseUrl, '/resource');
    const baseReceiveFrom = joinUrl(baseUrl, pathPrefix, '/');

    // Connecting to the base URL, which is the parent container
    const streamingResponse = await fetch(baseReceiveFrom, {
      dispatcher: new Agent({ bodyTimeout: 1000 }),
    });
    const reader = streamingResponse.body!.getReader();
    const decoder = new TextDecoder();
    const parser = new Parser();

    try {
      // Ignore initial notification
      await reader.read().then(({ value }): string => decoder.decode(value));

      // Create contained resource
      const createResponse = await fetch(resource, {
        method: 'PUT',
        headers: { 'content-type': 'text/plain' },
        body: 'abc',
      });
      expect(createResponse.status).toBe(201);

      // Will receive the Add notification
      const addNotification = await reader.read().then(({ value }): string => decoder.decode(value));
      expect(addNotification).toBeDefined();

      const addQuads = new Store(parser.parse(addNotification));

      expect(addQuads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Add ]);
      expect(addQuads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(resource) ]);
      expect(addQuads.getObjects(null, AS.terms.target, null)).toEqual([ namedNode(baseUrl) ]);

      // Remove contained resource
      const removeResponse = await fetch(resource, {
        method: 'DELETE',
      });
      expect(removeResponse.status).toBe(205);

      // Will receive the Remove notification
      const removeNotification = await reader.read().then(({ value }): string => decoder.decode(value));
      expect(removeNotification).toBeDefined();

      const removeQuads = new Store(parser.parse(removeNotification));

      expect(removeQuads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Remove ]);
      expect(removeQuads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(resource) ]);
      expect(removeQuads.getObjects(null, AS.terms.target, null)).toEqual([ namedNode(baseUrl) ]);
    } finally {
      reader.releaseLock();
      await streamingResponse.body!.cancel();
    }
  });
});
