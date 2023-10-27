import fetch from 'cross-fetch';
import { DataFactory } from 'n3';
import type { App } from '../../src/init/App';
import { deleteResource, expectQuads, getResource, patchResource, putResource } from '../util/FetchUtil';
import { getPort } from '../util/Util';
import {
  getDefaultVariables,
  getPresetConfigPath,
  getTestConfigPath,
  getTestFolder,
  instantiateFromConfig,
  removeFolder,
} from './Config';

const { namedNode, quad } = DataFactory;

const port = getPort('Conditions');
const baseUrl = `http://localhost:${port}/`;

// File stores handle last-modified dates differently so need to test both
const rootFilePath = getTestFolder('conditions');
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

describe.each(stores)('A server supporting conditions with %s', (name, { storeConfig, teardown }): void => {
  let app: App;

  beforeAll(async(): Promise<void> => {
    const variables = {
      ...getDefaultVariables(port, baseUrl),
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };

    // Create and start the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        getPresetConfigPath(storeConfig),
        getTestConfigPath('ldp-with-auth.json'),
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

  it('prevents operations on existing resources with "if-none-match: *" header.', async(): Promise<void> => {
    const documentUrl = `${baseUrl}document1.txt`;
    // PUT
    await putResource(documentUrl, { contentType: 'text/plain', body: 'TESTFILE' });

    // Overwrite fails because of header
    let response = await fetch(documentUrl, {
      method: 'PUT',
      headers: { 'content-type': 'text/plain', 'if-none-match': '*' },
      body: 'TESTFILE1',
    });
    expect(response.status).toBe(412);

    // Verify original contents stayed the same
    response = await getResource(documentUrl);
    await expect(response.text()).resolves.toBe('TESTFILE');

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
  });

  it('prevents creating new resources with "if-match: *" header.', async(): Promise<void> => {
    const documentUrl = `${baseUrl}document2.txt`;
    const query = 'INSERT {<http://test.com/s1> <http://test.com/p1> <http://test.com/o1>} WHERE {}';

    // PATCH fails because of header
    let response = await fetch(documentUrl, {
      method: 'PATCH',
      headers: { 'content-type': 'application/sparql-update', 'if-match': '*' },
      body: query,
    });
    expect(response.status).toBe(412);

    // PUT
    await patchResource(documentUrl, query, 'sparql');

    // PUT with header now succeeds
    const query2 = 'INSERT {<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>} WHERE {}';
    response = await fetch(documentUrl, {
      method: 'PATCH',
      headers: { 'content-type': 'application/sparql-update', 'if-match': '*' },
      body: query2,
    });
    expect(response.status).toBe(205);

    // Verify the contents got updated
    response = await getResource(documentUrl);
    const expected = [
      quad(namedNode('http://test.com/s1'), namedNode('http://test.com/p1'), namedNode('http://test.com/o1')),
      quad(namedNode('http://test.com/s2'), namedNode('http://test.com/p2'), namedNode('http://test.com/o2')),
    ];
    await expectQuads(response, expected, true);

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
  });

  it('prevents operations if the "if-match" header does not match.', async(): Promise<void> => {
    // GET root ETag
    let response = await getResource(baseUrl);
    const eTag = response.headers.get('ETag');
    expect(typeof eTag).toBe('string');

    // POST fails because of header
    response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', 'if-match': '"notAMatchingETag"' },
      body: 'TESTFILE',
    });
    expect(response.status).toBe(412);

    // POST succeeds with correct header
    response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', 'if-match': eTag! },
      body: 'TESTFILE1',
    });
    expect(response.status).toBe(201);
    const documentUrl = response.headers.get('location');
    expect(typeof documentUrl).toBe('string');

    // DELETE
    await expect(deleteResource(documentUrl!)).resolves.toBeUndefined();
  });

  it('prevents operations if the "if-none-match" header does match.', async(): Promise<void> => {
    // GET root ETag
    let response = await getResource(baseUrl);
    const eTag = response.headers.get('ETag');
    expect(typeof eTag).toBe('string');

    // POST fails because of header
    response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', 'if-none-match': eTag! },
      body: 'TESTFILE',
    });
    expect(response.status).toBe(412);

    // POST succeeds with correct header
    response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', 'if-none-match': '"notAMatchingETag"' },
      body: 'TESTFILE1',
    });
    expect(response.status).toBe(201);
    const documentUrl = response.headers.get('location');
    expect(typeof documentUrl).toBe('string');

    // DELETE
    await expect(deleteResource(documentUrl!)).resolves.toBeUndefined();
  });

  it('throws 304 error if "if-none-match" header matches and request type is GET or HEAD.', async(): Promise<void> => {
    // GET root ETag
    let response = await getResource(baseUrl);
    const eTag = response.headers.get('ETag');
    expect(typeof eTag).toBe('string');

    // GET fails because of header
    response = await fetch(baseUrl, {
      method: 'GET',
      headers: { 'if-none-match': eTag! },
    });
    expect(response.status).toBe(304);
    expect(response.headers.get('etag')).toBe(eTag);

    // HEAD fails because of header
    response = await fetch(baseUrl, {
      method: 'HEAD',
      headers: { 'if-none-match': eTag! },
    });
    expect(response.status).toBe(304);
    expect(response.headers.get('etag')).toBe(eTag);

    // GET succeeds if the ETag header doesn't match
    response = await fetch(baseUrl, {
      method: 'GET',
      headers: { 'if-none-match': '"123456"' },
    });
    expect(response.status).toBe(200);
  });

  it('prevents operations if the "if-unmodified-since" header is before the modified date.', async(): Promise<void> => {
    const documentUrl = `${baseUrl}document3.txt`;
    // PUT
    let response = await putResource(documentUrl, { contentType: 'text/plain', body: 'TESTFILE' });

    // GET last-modified header
    response = await getResource(documentUrl);
    const lastModifiedVal = response.headers.get('last-modified');
    expect(typeof lastModifiedVal).toBe('string');
    const lastModified = new Date(lastModifiedVal!);

    const oldDate = new Date(Date.now() - 10000);

    // DELETE fails because oldDate < lastModified
    response = await fetch(documentUrl, {
      method: 'DELETE',
      headers: { 'if-unmodified-since': oldDate.toUTCString() },
    });
    expect(response.status).toBe(412);

    // DELETE succeeds because lastModified date matches
    response = await fetch(documentUrl, {
      method: 'DELETE',
      headers: { 'if-unmodified-since': lastModified.toUTCString() },
    });
    expect(response.status).toBe(205);
  });

  it('returns different ETags for different content-types.', async(): Promise<void> => {
    let response = await getResource(baseUrl, { accept: 'text/turtle' }, { contentType: 'text/turtle' });
    const eTagTurtle = response.headers.get('ETag');
    response = await getResource(baseUrl, { accept: 'application/ld+json' }, { contentType: 'application/ld+json' });
    const eTagJson = response.headers.get('ETag');
    expect(eTagTurtle).not.toEqual(eTagJson);

    // Both ETags can be used on the same resource
    response = await fetch(baseUrl, { headers: { 'if-none-match': eTagTurtle!, accept: 'text/turtle' }});
    expect(response.status).toBe(304);
    expect(response.headers.get('etag')).toBe(eTagTurtle);
    response = await fetch(baseUrl, { headers: { 'if-none-match': eTagJson!, accept: 'application/ld+json' }});
    expect(response.status).toBe(304);
    expect(response.headers.get('etag')).toBe(eTagJson);

    // But not for the other representation
    response = await fetch(baseUrl, { headers: { 'if-none-match': eTagTurtle!, accept: 'application/ld+json' }});
    expect(response.status).toBe(200);
  });
});
