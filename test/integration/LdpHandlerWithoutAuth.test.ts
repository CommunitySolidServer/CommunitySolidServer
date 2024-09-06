import { createReadStream } from 'node:fs';
import fetch from 'cross-fetch';
import type { Quad } from 'n3';
import { DataFactory, Parser, Store } from 'n3';
import { joinFilePath, joinUrl, PIM, RDF } from '../../src/';
import type { App } from '../../src/';
import { LDP } from '../../src/util/Vocabularies';
import {
  deleteResource,
  expectQuads,
  getResource,
  patchResource,
  postResource,
  putResource,
} from '../util/FetchUtil';
import { getPort } from '../util/Util';
import {
  getDefaultVariables,
  getPresetConfigPath,
  getTestConfigPath,
  getTestFolder,
  instantiateFromConfig,
  removeFolder,
} from './Config';

const { literal, namedNode, quad } = DataFactory;

const port = getPort('LpdHandlerWithoutAuth');
const baseUrl = `http://localhost:${port}/`;
const metaSuffix = '.meta';
const rootFilePath = getTestFolder('full-config-no-auth');
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

describe.each(stores)('An LDP handler allowing all requests %s', (name, { storeConfig, teardown }): void => {
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

  it('returns the root container listing.', async(): Promise<void> => {
    const response = await getResource(baseUrl, {}, { contentType: 'text/turtle' });

    await expect(response.text()).resolves.toContain('ldp:BasicContainer');
    expect(response.headers.get('link')).toContain(`<${PIM.Storage}>; rel="type"`);
  });

  it('returns the root container listing when asking for */*.', async(): Promise<void> => {
    const response = await getResource(baseUrl, { accept: '*/*' }, { contentType: 'text/turtle' });

    await expect(response.text()).resolves.toContain('ldp:BasicContainer');
    expect(response.headers.get('link')).toContain(`<${PIM.Storage}>; rel="type"`);
  });

  it('can read a container listing with a query string.', async(): Promise<void> => {
    // Helper functions would fail due to query params
    const response = await fetch(`${baseUrl}?abc=def&xyz`, { headers: { accept: 'text/turtle' }});
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/turtle');
    expect(response.headers.get('link')).toContain(`<${LDP.Container}>; rel="type"`);
    expect(response.headers.get('link')).toContain(`<${baseUrl}.acl>; rel="acl"`);
    expect(response.headers.get('link')).toContain(`<${PIM.Storage}>; rel="type"`);

    const parser = new Parser({ baseIRI: baseUrl });
    const quads = parser.parse(await response.text());
    const store = new Store(quads);
    expect(store.countQuads(namedNode(baseUrl), RDF.terms.type, LDP.terms.Container, null)).toBe(1);
  });

  it('can add a document to the store, read it and delete it.', async(): Promise<void> => {
    const documentUrl = `${baseUrl}document.txt`;
    // PUT
    await putResource(documentUrl, { contentType: 'text/plain', body: 'TESTFILE0' });

    // GET
    const response = await getResource(documentUrl, {}, { contentType: 'text/plain' });
    await expect(response.text()).resolves.toBe('TESTFILE0');

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
  });

  it('can add and overwrite a document.', async(): Promise<void> => {
    const documentUrl = `${baseUrl}document.txt`;
    // PUT
    await putResource(documentUrl, { contentType: 'text/plain', body: 'TESTFILE0' });

    // GET
    let response = await getResource(documentUrl, {}, { contentType: 'text/plain' });
    await expect(response.text()).resolves.toBe('TESTFILE0');

    // PUT
    await putResource(documentUrl, { contentType: 'text/plain', body: 'TESTFILE1', exists: true });

    // GET
    response = await getResource(documentUrl, {}, { contentType: 'text/plain' });
    await expect(response.text()).resolves.toBe('TESTFILE1');

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
  });

  it('can create a container and delete it.', async(): Promise<void> => {
    const containerUrl = `${baseUrl}secondContainer/`;
    // PUT
    await putResource(containerUrl, { contentType: 'text/turtle' });

    // GET
    const response = await getResource(containerUrl);

    // Verify container listing
    await expectQuads(response, [
      quad(namedNode(containerUrl), RDF.terms.type, LDP.terms.Container),
    ]);

    // DELETE
    await expect(deleteResource(containerUrl)).resolves.toBeUndefined();
  });

  it('can create a container and retrieve it.', async(): Promise<void> => {
    // Create container
    const containerUrl = `${baseUrl}testcontainer0/`;
    await putResource(containerUrl, { contentType: 'text/turtle' });

    // GET representation
    const response = await getResource(containerUrl, { accept: '*/*' }, { contentType: 'text/turtle' });
    await expect(response.text()).resolves.toContain('ldp:BasicContainer');

    // DELETE
    await expect(deleteResource(containerUrl)).resolves.toBeUndefined();
  });

  it('can create a container and view it as HTML.', async(): Promise<void> => {
    // Create container
    const containerUrl = `${baseUrl}testcontainer0/`;
    await putResource(containerUrl, { contentType: 'text/turtle' });

    // GET representation
    const response = await getResource(containerUrl, { accept: 'text/html' }, { contentType: 'text/html' });
    await expect(response.text()).resolves.toContain('Contents of testcontainer0');

    // DELETE
    await expect(deleteResource(containerUrl)).resolves.toBeUndefined();
  });

  it('can create a container and put a document in it.', async(): Promise<void> => {
    // Create container
    const containerUrl = `${baseUrl}testcontainer0/`;
    await putResource(containerUrl, { contentType: 'text/turtle' });

    // Create document
    const documentUrl = `${containerUrl}testdocument0.txt`;
    await putResource(documentUrl, { contentType: 'text/plain', body: 'TESTFILE0' });

    // GET document
    const response = await getResource(documentUrl, {}, { contentType: 'text/plain' });
    await expect(response.text()).resolves.toBe('TESTFILE0');

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
    await expect(deleteResource(containerUrl)).resolves.toBeUndefined();
  });

  it('can create a container without content-type.', async(): Promise<void> => {
    // Create container
    const containerUrl = `${baseUrl}testcontainer0/`;
    const slug = 'testcontainer1/';
    const putResponse = await fetch(containerUrl, {
      method: 'PUT',
    });
    const postResponse = await fetch(baseUrl, {
      method: 'Post',
      headers: {
        slug,
        link: `<http://www.w3.org/ns/ldp#Container>; rel="type"`,
      },
    });

    expect(putResponse.status).toBe(201);
    expect(putResponse.headers.get('location')).toBe(containerUrl);
    expect(postResponse.status).toBe(201);
    expect(postResponse.headers.get('location')).toBe(baseUrl + slug);

    // DELETE
    await expect(deleteResource(containerUrl)).resolves.toBeUndefined();
    await expect(deleteResource(baseUrl + slug)).resolves.toBeUndefined();
  });
  it('cannot remove a container when the container contains a document.', async(): Promise<void> => {
    // Create container
    const containerUrl = `${baseUrl}testfolder1/`;
    await putResource(containerUrl, { contentType: 'text/turtle' });

    // Create document
    const documentUrl = `${containerUrl}testdocument0.txt`;
    await putResource(documentUrl, { contentType: 'text/plain', body: 'TESTFILE0' });

    // Try to DELETE container
    const response = await fetch(containerUrl, { method: 'DELETE' });
    expect(response.status).toBe(409);
    await expect(response.text()).resolves.toContain('ConflictHttpError: Can only delete empty containers.');

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
    await expect(deleteResource(containerUrl)).resolves.toBeUndefined();
  });

  it('cannot remove a container when the container contains a subfolder.', async(): Promise<void> => {
    // Create container
    const containerUrl = `${baseUrl}testcontainer2/`;
    await putResource(containerUrl, { contentType: 'text/turtle' });

    // Create subcontainer
    const subContainerUrl = `${containerUrl}subcontainer0/`;
    await putResource(subContainerUrl, { contentType: 'text/turtle' });

    // Try to DELETE container
    const response = await fetch(containerUrl, { method: 'DELETE' });
    expect(response.status).toBe(409);
    await expect(response.text()).resolves.toContain('ConflictHttpError: Can only delete empty containers.');

    // DELETE
    await expect(deleteResource(subContainerUrl)).resolves.toBeUndefined();
    await expect(deleteResource(containerUrl)).resolves.toBeUndefined();
  });

  it('can read the contents of a container.', async(): Promise<void> => {
    // Create container
    const containerUrl = `${baseUrl}testcontainer3/`;
    await putResource(containerUrl, { contentType: 'text/turtle' });

    // Create subfolder
    const subContainerUrl = `${containerUrl}subcontainer0`;
    await putResource(subContainerUrl, { contentType: 'text/turtle' });

    // Create document
    const documentUrl = `${containerUrl}testfile0.txt`;
    await putResource(documentUrl, { contentType: 'text/plain', body: 'TESTFILE0' });

    const response = await getResource(containerUrl);
    await expectQuads(response, [
      quad(namedNode(containerUrl), LDP.terms.contains, namedNode(subContainerUrl)),
      quad(namedNode(containerUrl), LDP.terms.contains, namedNode(documentUrl)),
    ]);

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
    await expect(deleteResource(subContainerUrl)).resolves.toBeUndefined();
    await expect(deleteResource(containerUrl)).resolves.toBeUndefined();
  });

  it('can upload and delete an image.', async(): Promise<void> => {
    const documentUrl = `${baseUrl}image.png`;
    const response = await fetch(documentUrl, {
      method: 'PUT',
      headers: {
        'content-type': 'image/png',
      },
      body: createReadStream(joinFilePath(__dirname, '../assets/testimage.png')) as any,
    });
    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe(documentUrl);
    await expect(response.text()).resolves.toHaveLength(0);

    // GET
    await getResource(documentUrl, {}, { contentType: 'image/png' });

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
  });

  it('can create a resource with a diamond identifier in the data.', async(): Promise<void> => {
    const slug = 'my-resource';

    const body = '<> <http://www.w3.org/2000/01/rdf-schema#label> "My Resource" .';
    let response = await postResource(baseUrl, { isContainer: false, contentType: 'text/turtle', slug, body });
    expect(response.headers.get('location')).toBe(`${baseUrl}${slug}`);

    // GET
    const containerUrl = `${baseUrl}${slug}`;
    response = await getResource(containerUrl);

    await expectQuads(response, [
      quad(namedNode(containerUrl), namedNode('http://www.w3.org/2000/01/rdf-schema#label'), literal('My Resource')),
    ]);

    // DELETE
    await expect(deleteResource(containerUrl)).resolves.toBeUndefined();
  });

  // https://github.com/CommunitySolidServer/CommunitySolidServer/issues/498
  it('accepts a GET with Content-Length: 0.', async(): Promise<void> => {
    // PUT
    const documentUrl = `${baseUrl}foo/bar`;
    const response = await fetch(documentUrl, {
      method: 'PUT',
      headers: { 'content-length': '0', 'content-type': 'text/turtle' },
      body: '',
    });
    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe(documentUrl);

    // GET
    await getResource(documentUrl);

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
  });

  it('can handle simple SPARQL updates.', async(): Promise<void> => {
    // POST
    const body = [
      '<http://test.com/s1> <http://test.com/p1> <http://test.com/o1>.',
      '<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>.',
    ].join('\n');
    let response = await postResource(baseUrl, { contentType: 'text/turtle', body });
    const documentUrl = response.headers.get('location')!;

    // PATCH
    const query = [
      'DELETE { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1> }',
      'INSERT {<http://test.com/s3> <http://test.com/p3> <http://test.com/o3>}',
      'WHERE {}',
    ].join('\n');
    await patchResource(documentUrl, query, 'sparql', true);

    // PATCH using a content-type header with charset
    const query2 = [
      'DELETE { <http://test.com/s2> <http://test.com/p2> <http://test.com/o2> }',
      'INSERT {<#s4> <#p4> <#o4>}',
      'WHERE {}',
    ].join('\n');
    response = await fetch(documentUrl, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/sparql-update ; charset=UTF-8',
      },
      body: query2,
    });
    await expect(response.text()).resolves.toHaveLength(0);
    expect(response.status).toBe(205);

    // GET
    response = await getResource(documentUrl);
    const expected = [
      quad(
        namedNode('http://test.com/s3'),
        namedNode('http://test.com/p3'),
        namedNode('http://test.com/o3'),
      ),
      quad(
        namedNode(`${documentUrl}#s4`),
        namedNode(`${documentUrl}#p4`),
        namedNode(`${documentUrl}#o4`),
      ),
    ];
    await expectQuads(response, expected, true);

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
  });

  it('can handle simple N3 Patch updates.', async(): Promise<void> => {
    // POST
    const body = [
      '<http://test.com/s1> <http://test.com/p1> <http://test.com/o1>.',
      '<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>.',
    ].join('\n');
    let response = await postResource(baseUrl, { contentType: 'text/turtle', body });
    const documentUrl = response.headers.get('location')!;

    // PATCH
    const query = [
      '@prefix solid: <http://www.w3.org/ns/solid/terms#>.',
      '<> a solid:InsertDeletePatch;',
      'solid:deletes { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1> };',
      'solid:inserts { <http://test.com/s3> <http://test.com/p3> <http://test.com/o3> }.',
    ].join('\n');
    await patchResource(documentUrl, query, 'n3', true);

    // PATCH using a content-type header with charset
    const query2 = [
      '@prefix solid: <http://www.w3.org/ns/solid/terms#>.',
      '<> a solid:InsertDeletePatch;',
      'solid:deletes { <http://test.com/s2> <http://test.com/p2> <http://test.com/o2> };',
      'solid:inserts {<#s4> <#p4> <#o4>}.',
    ].join('\n');
    response = await fetch(documentUrl, {
      method: 'PATCH',
      headers: {
        'content-type': 'text/n3 ; charset=UTF-8',
      },
      body: query2,
    });
    await expect(response.text()).resolves.toHaveLength(0);
    expect(response.status).toBe(205);

    // GET
    response = await getResource(documentUrl);
    const expected = [
      quad(
        namedNode('http://test.com/s3'),
        namedNode('http://test.com/p3'),
        namedNode('http://test.com/o3'),
      ),
      quad(
        namedNode(`${documentUrl}#s4`),
        namedNode(`${documentUrl}#p4`),
        namedNode(`${documentUrl}#o4`),
      ),
    ];
    await expectQuads(response, expected, true);

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
  });

  it('can not handle SPARQL updates on containers.', async(): Promise<void> => {
    // POST
    const body = [
      '<http://test.com/s1> <http://test.com/p1> <http://test.com/o1>.',
      '<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>.',
    ].join('\n');
    let response = await postResource(baseUrl, { contentType: 'text/turtle', body, isContainer: true });
    const documentUrl = response.headers.get('location')!;

    // PATCH
    const query = [
      'DELETE { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1> }',
      'INSERT {<http://test.com/s3> <http://test.com/p3> <http://test.com/o3>}',
      'WHERE {}',
    ].join('\n');

    // We don't want you to PATCH on containers
    response = await fetch(documentUrl, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/sparql-update',
      },
      body: query,
    });
    expect(response.status).toBe(409);

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
  });

  it('can not handle N3 Patch updates on containers.', async(): Promise<void> => {
    // POST
    const body = [
      '<http://test.com/s1> <http://test.com/p1> <http://test.com/o1>.',
      '<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>.',
    ].join('\n');
    let response = await postResource(baseUrl, { contentType: 'text/turtle', body, isContainer: true });
    const documentUrl = response.headers.get('location')!;

    // PATCH
    const query = [
      '@prefix solid: <http://www.w3.org/ns/solid/terms#>.',
      '<> a solid:InsertDeletePatch;',
      'solid:deletes { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1> };',
      'solid:inserts { <http://test.com/s3> <http://test.com/p3> <http://test.com/o3> }.',
    ].join('\n');

    // We don't want you to PATCH on containers
    response = await fetch(documentUrl, {
      method: 'PATCH',
      headers: {
        'content-type': 'text/n3',
      },
      body: query,
    });
    expect(response.status).toBe(409);

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
  });

  it('returns 405 for unsupported methods.', async(): Promise<void> => {
    let response = await fetch(baseUrl, { method: 'TRACE' });
    expect(response.status).toBe(405);

    // Testing two different URLs as there used to be a problem with this
    response = await fetch(joinUrl(baseUrl, 'foo'), { method: 'TRACE' });
    expect(response.status).toBe(405);
  });

  it('returns 415 for unsupported PATCH types.', async(): Promise<void> => {
    const response = await fetch(baseUrl, { method: 'PATCH', headers: { 'content-type': 'text/plain' }, body: 'abc' });
    expect(response.status).toBe(415);
  });

  it('maintains prefixes after PATCH operations.', async(): Promise<void> => {
    // POST
    const body = [
      '@prefix test: <http://test.com/>.',
      'test:s1 test:p1 test:o1.',
      'test:s2 test:p2 test:o2.',
    ].join('\n');
    let response = await postResource(baseUrl, { contentType: 'text/turtle', body });
    const documentUrl = response.headers.get('location')!;

    // PATCH
    const query = [
      'PREFIX test: <http://test.com/>',
      'DELETE { test:s1 test:p1 test:o1 }',
      'INSERT { test:s3 test:p3 test:o3. test:s4 test:p4 test:o4 }',
      'WHERE {}',
    ].join('\n');
    await patchResource(documentUrl, query, 'sparql', true);

    // GET
    response = await getResource(documentUrl);
    const parser = new Parser();
    const quads: Quad[] = [];
    let prefixes: any = {};
    const text = await response.clone().text();
    const promise = new Promise<void>((resolve, reject): void => {
      parser.parse(text, (error, aQuad, prefixHash): any => {
        if (aQuad) {
          quads.push(aQuad);
        }
        if (!aQuad) {
          prefixes = prefixHash;
          resolve();
        }
        if (error) {
          reject(error);
        }
      });
    });

    await promise;

    const expected = [
      quad(
        namedNode('http://test.com/s2'),
        namedNode('http://test.com/p2'),
        namedNode('http://test.com/o2'),
      ),
      quad(
        namedNode('http://test.com/s3'),
        namedNode('http://test.com/p3'),
        namedNode('http://test.com/o3'),
      ),
      quad(
        namedNode('http://test.com/s4'),
        namedNode('http://test.com/p4'),
        namedNode('http://test.com/o4'),
      ),
    ];
    await expectQuads(response, expected, true);
    expect(prefixes).toEqual({
      test: 'http://test.com/',
    });
    expect(quads).toHaveLength(3);

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
  });

  it('can not delete metadata resources directly.', async(): Promise<void> => {
    const documentUrl = `${baseUrl}document.txt`;

    // PUT
    await putResource(documentUrl, { contentType: 'text/plain', body: 'TESTFILE0' });

    // DELETE metadata attempt
    const response = await fetch(documentUrl + metaSuffix, { method: 'DELETE' });
    expect(response.status).toBe(409);

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
  });

  it('can not create metadata directly.', async(): Promise<void> => {
    const slug = `document.txt${metaSuffix}`;
    const documentMetaURL = `${baseUrl}${slug}`;

    // POST
    const postResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'text/turtle', slug },
      body: '<a> <b> <c>.',
    });
    expect(postResponse.status).toBe(403);

    // PUT
    const putResponse = await fetch(documentMetaURL, {
      method: 'PUT',
      headers: { 'content-type': 'text/turtle' },
      body: '<a> <b> <c>.',
    });
    expect(putResponse.status).toBe(405);

    // PATCH
    const patchResponse = await fetch(documentMetaURL, {
      method: 'PATCH',
      headers: { 'content-type': 'application/sparql-update' },
      body: 'INSERT DATA {<a> <b> <c>.}',
    });
    expect(patchResponse.status).toBe(409);
  });

  it('can update metadata triples using PATCH.', async(): Promise<void> => {
    const documentUrl = `${baseUrl}document.txt`;
    const documentMetaURL = `${documentUrl}${metaSuffix}`;

    // PUT
    await putResource(documentUrl, { contentType: 'text/plain', body: 'TESTFILE0' });

    // PATCH
    const patchResponse = await fetch(documentMetaURL, {
      method: 'PATCH',
      headers: { 'content-type': 'application/sparql-update' },
      body: 'INSERT DATA {<a> <b> <c>.}',
    });
    expect(patchResponse.status).toBe(205);

    // GET
    const response = await fetch(documentMetaURL);
    await expectQuads(response, [ quad(namedNode(`${baseUrl}a`), namedNode(`${baseUrl}b`), namedNode(`${baseUrl}c`)) ]);

    // DELETE
    await expect(deleteResource(documentUrl)).resolves.toBeUndefined();
  });

  it('can not update metadata triples that are deemed immutable.', async(): Promise<void> => {
    const containerUrl = `${baseUrl}immutable/`;
    const metaUrl = containerUrl + metaSuffix;

    // PUT
    await putResource(containerUrl, { contentType: 'text/turtle' });

    // PATCH
    const pimResponse = await fetch(metaUrl, {
      method: 'PATCH',
      headers: { 'content-type': 'application/sparql-update' },
      body: `INSERT DATA {<${containerUrl}> <${RDF.type}> <${PIM.Storage}>.}`,
    });
    expect(pimResponse.status).toBe(409);

    const ldpResponse = await fetch(metaUrl, {
      method: 'PATCH',
      headers: { 'content-type': 'application/sparql-update' },
      body: `INSERT DATA {<${containerUrl}> <${LDP.contains}> <b>.}`,
    });
    expect(ldpResponse.status).toBe(409);

    // DELETE
    await expect(deleteResource(containerUrl)).resolves.toBeUndefined();
  });

  it('can not create metadata resource of a metadata resource.', async(): Promise<void> => {
    const metaUrl = baseUrl + metaSuffix + metaSuffix;
    const response = await fetch(metaUrl, {
      method: 'PATCH',
      headers: { 'content-type': 'application/sparql-update' },
      body: `INSERT DATA {<a> <b> <c>.}`,
    });
    expect(response.status).toBe(409);
  });

  it('returns metadata resource location in link header.', async(): Promise<void> => {
    const response = await fetch(baseUrl, { method: 'HEAD' });
    expect(response.headers.get('link')).toContain(`<${baseUrl}${metaSuffix}>; rel="describedby"`);
  });

  it('can read metadata.', async(): Promise<void> => {
    const response = await fetch(baseUrl + metaSuffix);
    expect(response.status).toBe(200);
    await expectQuads(response, [ quad(namedNode(baseUrl), namedNode(RDF.type), namedNode(PIM.Storage)) ]);
  });

  it('preserves metadata when link header is present.', async(): Promise<void> => {
    const resourceUrl = `${baseUrl}preserved`;
    const metaUrl = resourceUrl + metaSuffix;
    // PUT
    await putResource(resourceUrl, { contentType: 'text/turtle', body: '<a> <b> <c>.' });

    // PATCH
    await patchResource(metaUrl, `INSERT DATA {<${baseUrl}a> <${baseUrl}b> <${baseUrl}c>.}`, 'sparql', true);

    // PUT
    const preserveResource = await fetch(resourceUrl, {
      method: 'PUT',
      headers: {
        'content-type': 'text/turtle',
        link: `<${metaUrl}>;rel="preserve"`,
      },
      body: '<a> <b> <d>.',
    });
    expect(preserveResource.status).toBe(205);

    const metadataResponse = await fetch(metaUrl);
    const metadata = await metadataResponse.text();
    expect(metadata).toContain(`<${baseUrl}a> <${baseUrl}b> <${baseUrl}c>.`);

    // DELETE
    await deleteResource(resourceUrl);
  });

  it('clears metadata by default.', async(): Promise<void> => {
    const resourceUrl = `${baseUrl}notPreserved`;
    const metaUrl = resourceUrl + metaSuffix;
    // PUT
    await putResource(resourceUrl, { contentType: 'text/turtle', body: '<a> <b> <c>.' });

    // PATCH
    await patchResource(metaUrl, `INSERT DATA {<a> <b> <c>.}`, 'sparql', true);

    // PUT
    await putResource(resourceUrl, { contentType: 'text/turtle', body: '<a> <b> <d>.', exists: true });

    const metadataResponse = await fetch(metaUrl);
    const metadata = await metadataResponse.text();
    expect(metadata).not.toContain(`<${baseUrl}a> <${baseUrl}b> <${baseUrl}c>.`);

    // DELETE
    await deleteResource(resourceUrl);
  });

  it('supports range requests.', async(): Promise<void> => {
    const resourceUrl = joinUrl(baseUrl, 'range');
    await putResource(resourceUrl, { contentType: 'text/plain', body: '0123456789' });

    let response = await fetch(resourceUrl, { headers: { range: 'bytes=0-5' }});
    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe('bytes 0-5/10');
    expect(response.headers.get('content-length')).toBe('6');
    await expect(response.text()).resolves.toBe('012345');

    response = await fetch(resourceUrl, { headers: { range: 'bytes=5-' }});
    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe('bytes 5-9/10');
    expect(response.headers.get('content-length')).toBe('5');
    await expect(response.text()).resolves.toBe('56789');

    response = await fetch(resourceUrl, { headers: { range: 'bytes=-4' }});
    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe('bytes 6-9/10');
    expect(response.headers.get('content-length')).toBe('4');
    await expect(response.text()).resolves.toBe('6789');

    response = await fetch(resourceUrl, { headers: { range: 'bytes=5-15' }});
    expect(response.status).toBe(416);
  });
});
