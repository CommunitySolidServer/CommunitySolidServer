import { createReadStream } from 'fs';
import type { Server } from 'http';
import fetch from 'cross-fetch';
import { DataFactory, Parser } from 'n3';
import { joinFilePath, PIM, RDF } from '../../src/';
import type { Initializer } from '../../src/';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { LDP } from '../../src/util/Vocabularies';
import { deleteResource, expectQuads, getResource, patchResource, postResource, putResource } from '../util/FetchUtil';
import { getPort } from '../util/Util';
import { getPresetConfigPath, getTestConfigPath, getTestFolder, instantiateFromConfig, removeFolder } from './Config';
const { literal, namedNode, quad } = DataFactory;

const port = getPort('LpdHandlerWithoutAuth');
const baseUrl = `http://localhost:${port}/`;

const rootFilePath = getTestFolder('full-config-no-auth');
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

describe.each(stores)('An LDP handler allowing all requests %s', (name, { storeConfig, teardown }): void => {
  let server: Server;
  let initializer: Initializer;
  let factory: HttpServerFactory;

  beforeAll(async(): Promise<void> => {
    const variables: Record<string, any> = {
      'urn:solid-server:default:variable:baseUrl': baseUrl,
      'urn:solid-server:default:variable:showStackTrace': true,
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };

    // Create and initialize the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        getPresetConfigPath(storeConfig),
        getTestConfigPath('ldp-with-auth.json'),
      ],
      variables,
    ) as Record<string, any>;
    ({ factory, initializer } = instances);

    await initializer.handleSafe();
    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    await teardown();
    await new Promise((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
  });

  it('can read a container listing.', async(): Promise<void> => {
    const response = await getResource(baseUrl);

    await expectQuads(response, [
      quad(namedNode(baseUrl), RDF.terms.type, LDP.terms.Container),
    ]);

    // This is only here because we're accessing the root container
    expect(response.headers.get('link')).toContain(`<${PIM.Storage}>; rel="type"`);
  });

  it('can read a container listing with a query string.', async(): Promise<void> => {
    // Helper functions would fail due to query params
    const response = await fetch(`${baseUrl}?abc=def&xyz`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/turtle');
    expect(response.headers.get('link')).toContain(`<${LDP.Container}>; rel="type"`);
    expect(response.headers.get('link')).toContain(`<${baseUrl}.acl>; rel="acl"`);
    expect(response.headers.get('link')).toContain(`<${PIM.Storage}>; rel="type"`);

    const parser = new Parser({ baseIRI: baseUrl });
    const quads = parser.parse(await response.text());
    expect(quads.some((entry): boolean => entry.equals(
      quad(namedNode(baseUrl), RDF.terms.type, LDP.terms.Container),
    ))).toBe(true);
  });

  it('can add a document to the store, read it and delete it.', async(): Promise<void> => {
    const documentUrl = `${baseUrl}document.txt`;
    // PUT
    await putResource(documentUrl, { contentType: 'text/plain', body: 'TESTFILE0' });

    // GET
    const response = await getResource(documentUrl, { contentType: 'text/plain' });
    await expect(response.text()).resolves.toBe('TESTFILE0');

    // DELETE
    expect(await deleteResource(documentUrl)).toBeUndefined();
  });

  it('can add and overwrite a document.', async(): Promise<void> => {
    const documentUrl = `${baseUrl}document.txt`;
    // PUT
    await putResource(documentUrl, { contentType: 'text/plain', body: 'TESTFILE0' });

    // GET
    let response = await getResource(documentUrl, { contentType: 'text/plain' });
    await expect(response.text()).resolves.toBe('TESTFILE0');

    // PUT
    await putResource(documentUrl, { contentType: 'text/plain', body: 'TESTFILE1' });

    // GET
    response = await getResource(documentUrl, { contentType: 'text/plain' });
    await expect(response.text()).resolves.toBe('TESTFILE1');

    // DELETE
    expect(await deleteResource(documentUrl)).toBeUndefined();
  });

  it('can create a container and delete it.', async(): Promise<void> => {
    const containerUrl = `${baseUrl}secondContainer/`;
    // PUT
    await putResource(containerUrl, { contentType: 'text/turtle' });

    // GET
    await getResource(containerUrl);

    // DELETE
    expect(await deleteResource(containerUrl)).toBeUndefined();
  });

  it('can create a container and put a document in it.', async(): Promise<void> => {
    // Create container
    const containerUrl = `${baseUrl}testcontainer0/`;
    await putResource(containerUrl, { contentType: 'text/turtle' });

    // Create document
    const documentUrl = `${containerUrl}testdocument0.txt`;
    await putResource(documentUrl, { contentType: 'text/plain', body: 'TESTFILE0' });

    // GET document
    const response = await getResource(documentUrl, { contentType: 'text/plain' });
    await expect(response.text()).resolves.toBe('TESTFILE0');

    // DELETE
    expect(await deleteResource(documentUrl)).toBeUndefined();
    expect(await deleteResource(containerUrl)).toBeUndefined();
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
    expect(await deleteResource(documentUrl)).toBeUndefined();
    expect(await deleteResource(containerUrl)).toBeUndefined();
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
    expect(await deleteResource(subContainerUrl)).toBeUndefined();
    expect(await deleteResource(containerUrl)).toBeUndefined();
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
    expect(await deleteResource(documentUrl)).toBeUndefined();
    expect(await deleteResource(subContainerUrl)).toBeUndefined();
    expect(await deleteResource(containerUrl)).toBeUndefined();
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
    expect(response.status).toBe(205);
    await expect(response.text()).resolves.toHaveLength(0);

    // GET
    await getResource(documentUrl, { contentType: 'image/png' });

    // DELETE
    expect(await deleteResource(documentUrl)).toBeUndefined();
  });

  it('can create a container with a diamond identifier in the data.', async(): Promise<void> => {
    const slug = 'my-container';

    const body = '<> <http://www.w3.org/2000/01/rdf-schema#label> "My Container" .';
    let response = await postResource(baseUrl, { isContainer: true, contentType: 'text/turtle', slug, body });
    expect(response.headers.get('location')).toBe(`${baseUrl}${slug}/`);

    // GET
    const containerUrl = `${baseUrl}${slug}/`;
    response = await getResource(containerUrl);

    await expectQuads(response, [
      quad(namedNode(containerUrl), namedNode('http://www.w3.org/2000/01/rdf-schema#label'), literal('My Container')),
    ]);

    // DELETE
    expect(await deleteResource(containerUrl)).toBeUndefined();
  });

  // https://github.com/solid/community-server/issues/498
  it('accepts a GET with Content-Length: 0.', async(): Promise<void> => {
    // PUT
    const documentUrl = `${baseUrl}foo/bar`;
    const response = await fetch(documentUrl, {
      method: 'PUT',
      headers: { 'content-length': '0', 'content-type': 'text/turtle' },
      body: '',
    });
    expect(response.status).toBe(205);

    // GET
    await getResource(documentUrl);

    // DELETE
    expect(await deleteResource(documentUrl)).toBeUndefined();
  });

  it('can handle simple SPARQL updates.', async(): Promise<void> => {
    // POST
    const body = [ '<http://test.com/s1> <http://test.com/p1> <http://test.com/o1>.',
      '<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>.' ].join('\n');
    let response = await postResource(baseUrl, { contentType: 'text/turtle', body });
    const documentUrl = response.headers.get('location')!;

    // PATCH
    const query = [ 'DELETE { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1> }',
      'INSERT {<http://test.com/s3> <http://test.com/p3> <http://test.com/o3>}',
      'WHERE {}',
    ].join('\n');
    await patchResource(documentUrl, query);

    // PATCH using a content-type header with charset
    const query2 = [ 'DELETE { <http://test.com/s2> <http://test.com/p2> <http://test.com/o2> }',
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
    expect(await deleteResource(documentUrl)).toBeUndefined();
  });
});
