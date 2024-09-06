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
const pathPrefix = '.notifications/StreamingHTTPChannel2023';

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

async function readChunk(reader: ReadableStreamDefaultReader): Promise<Store> {
  const decoder = new TextDecoder();
  const parser = new Parser();
  const { value } = await reader.read();
  const notification = decoder.decode(value);
  return new Store(parser.parse(notification));
}

function endpoint(topic: string): string {
  return joinUrl(baseUrl, pathPrefix, encodeURIComponent(topic));
}

describe.each(stores)('A server supporting StreamingHTTPChannel2023 using %s', (name, { configs, teardown }): void => {
  let app: App;
  let store: ResourceStore;
  const webId = 'http://example.com/card/#me';
  const topic = joinUrl(baseUrl, '/foo');
  const receiveFrom = endpoint(topic);

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

  it('only allows GET on receiveFrom endpoint.', async(): Promise<void> => {
    const methods = [ 'HEAD', 'PUT', 'POST' ];
    for (const method of methods) {
      const response = await fetch(receiveFrom, {
        method,
      });
      expect(response.status).toBe(405);
    }

    // For some reason it differs
    const del = await fetch(receiveFrom, {
      method: 'DELETE',
    });
    expect(del.status).toBe(404);
  });

  it('emits initial Update if topic exists.', async(): Promise<void> => {
    await store.setRepresentation({ path: topic }, new BasicRepresentation('new', 'text/plain'));
    const streamingResponse = await fetch(receiveFrom);
    const reader = streamingResponse.body!.getReader();

    try {
      const quads = await readChunk(reader);
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
    const streamingResponse = await fetch(receiveFrom);
    const reader = streamingResponse.body!.getReader();

    try {
      const quads = await readChunk(reader);
      expect(quads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Delete ]);
      expect(quads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(topic) ]);
    } finally {
      reader.releaseLock();
      await streamingResponse.body!.cancel();
    }
  });

  it('does not emit initial notification when other receivers connect.', async(): Promise<void> => {
    await store.setRepresentation({ path: topic }, new BasicRepresentation('new', 'text/plain'));
    const streamingResponse = await fetch(receiveFrom);
    const reader = streamingResponse.body!.getReader();

    const otherResponse = await fetch(receiveFrom);
    const otherReader = otherResponse.body!.getReader();

    try {
      // Expected initial notification
      const updateQuads = await readChunk(reader);
      expect(updateQuads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Update ]);
      expect(updateQuads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(topic) ]);

      // Expected initial notification on other receiver
      const otherQuads = await readChunk(otherReader);
      expect(otherQuads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Update ]);
      expect(otherQuads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(topic) ]);

      // Delete resource
      const response = await fetch(topic, {
        method: 'DELETE',
      });
      expect(response.status).toBe(205);

      // If it was caused by the other receiver connecting, it would have been Update as well
      const deleteQuads = await readChunk(reader);
      expect(deleteQuads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Delete ]);
      expect(deleteQuads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(topic) ]);
    } finally {
      reader.releaseLock();
      await streamingResponse.body!.cancel();
      otherReader.releaseLock();
      await otherResponse.body!.cancel();
    }
  });

  it('emits Create events.', async(): Promise<void> => {
    try {
      await store.deleteResource({ path: topic });
    } catch {}
    const streamingResponse = await fetch(receiveFrom);
    const reader = streamingResponse.body!.getReader();

    try {
      // Ignore initial notification
      await readChunk(reader);

      // Create resource
      const response = await fetch(topic, {
        method: 'PUT',
        headers: { 'content-type': 'text/plain' },
        body: 'abc',
      });
      expect(response.status).toBe(201);

      const quads = await readChunk(reader);
      expect(quads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Create ]);
      expect(quads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(topic) ]);
    } finally {
      reader.releaseLock();
      await streamingResponse.body!.cancel();
    }
  });

  it('emits Update events.', async(): Promise<void> => {
    await store.setRepresentation({ path: topic }, new BasicRepresentation('new', 'text/plain'));
    const streamingResponse = await fetch(receiveFrom);
    const reader = streamingResponse.body!.getReader();

    try {
      // Ignore initial notification
      await readChunk(reader);

      // Update resource
      const response = await fetch(topic, {
        method: 'PUT',
        headers: { 'content-type': 'text/plain' },
        body: 'abc',
      });
      expect(response.status).toBe(205);

      const quads = await readChunk(reader);
      expect(quads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Update ]);
      expect(quads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(topic) ]);
    } finally {
      reader.releaseLock();
      await streamingResponse.body!.cancel();
    }
  });

  it('emits Delete events.', async(): Promise<void> => {
    await store.setRepresentation({ path: topic }, new BasicRepresentation('new', 'text/plain'));
    const streamingResponse = await fetch(receiveFrom);
    const reader = streamingResponse.body!.getReader();

    try {
      // Ignore initial notification
      await readChunk(reader);

      // Delete resource
      const response = await fetch(topic, {
        method: 'DELETE',
      });
      expect(response.status).toBe(205);

      const quads = await readChunk(reader);
      expect(quads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Delete ]);
      expect(quads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(topic) ]);
    } finally {
      reader.releaseLock();
      await streamingResponse.body!.cancel();
    }
  });

  it('prevents connecting to channels of restricted topics.', async(): Promise<void> => {
    const restricted = joinUrl(baseUrl, '/restricted');
    const restrictedReceiveFrom = endpoint(restricted);
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
    const baseReceiveFrom = endpoint(joinUrl(baseUrl, '/'));

    // Connecting to the base URL, which is the parent container
    const streamingResponse = await fetch(baseReceiveFrom);
    const reader = streamingResponse.body!.getReader();

    try {
      // Ignore initial notification
      await readChunk(reader);

      // Create contained resource
      const createResponse = await fetch(resource, {
        method: 'PUT',
        headers: { 'content-type': 'text/plain' },
        body: 'abc',
      });
      expect(createResponse.status).toBe(201);

      // Will receive the Add notification
      const addQuads = await readChunk(reader);

      expect(addQuads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Add ]);
      expect(addQuads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(resource) ]);
      expect(addQuads.getObjects(null, AS.terms.target, null)).toEqual([ namedNode(baseUrl) ]);

      // Remove contained resource
      const removeResponse = await fetch(resource, {
        method: 'DELETE',
      });
      expect(removeResponse.status).toBe(205);

      // Will receive the Remove notification
      const removeQuads = await readChunk(reader);
      expect(removeQuads.getObjects(null, RDF.terms.type, null)).toEqual([ AS.terms.Remove ]);
      expect(removeQuads.getObjects(null, AS.terms.object, null)).toEqual([ namedNode(resource) ]);
      expect(removeQuads.getObjects(null, AS.terms.target, null)).toEqual([ namedNode(baseUrl) ]);
    } finally {
      reader.releaseLock();
      await streamingResponse.body!.cancel();
    }
  });
});
