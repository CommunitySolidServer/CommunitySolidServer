import { DataFactory, Parser } from 'n3';
import type { MockResponse } from 'node-mocks-http';
import { ensureTrailingSlash, PIM, RDF } from '../../src/';
import type { HttpHandler, Initializer, ResourceStore } from '../../src/';
import { LDP } from '../../src/util/Vocabularies';
import { ResourceHelper } from '../util/TestHelpers';
import { BASE, getTestFolder, removeFolder, instantiateFromConfig } from './Config';
const { literal, namedNode, quad } = DataFactory;

const rootFilePath = getTestFolder('full-config-no-auth');
const stores: [string, any][] = [
  [ 'in-memory storage', {
    storeUrn: 'urn:solid-server:default:MemoryResourceStore',
    teardown: jest.fn(),
  }],
  [ 'on-disk storage', {
    storeUrn: 'urn:solid-server:default:FileResourceStore',
    teardown: (): void => removeFolder(rootFilePath),
  }],
];

describe.each(stores)('An LDP handler without auth using %s', (name, { storeUrn, teardown }): void => {
  let handler: HttpHandler;
  let resourceHelper: ResourceHelper;

  beforeAll(async(): Promise<void> => {
    const variables: Record<string, any> = {
      'urn:solid-server:default:variable:baseUrl': BASE,
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };
    const internalStore = await instantiateFromConfig(
      storeUrn,
      'ldp-with-auth.json',
      variables,
    ) as ResourceStore;
    variables['urn:solid-server:default:variable:store'] = internalStore;

    // Create and initialize the HTTP handler and related components
    let initializer: Initializer;
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      'ldp-with-auth.json',
      variables,
    ) as Record<string, any>;
    ({ handler, initializer } = instances);

    // Set up the internal store
    await initializer.handleSafe();

    // Create test helpers for manipulating the components
    resourceHelper = new ResourceHelper(handler, BASE);
  });

  afterAll(async(): Promise<void> => {
    await teardown();
  });

  it('can read a folder listing.', async():
  Promise<void> => {
    const response = await resourceHelper.getResource(`${BASE}/`);
    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/turtle');

    const parser = new Parser({ baseIRI: `${BASE}/` });
    const quads = parser.parse(response._getData().toString());
    expect(quads.some((entry): boolean => entry.equals(
      quad(namedNode(`${BASE}/`), RDF.terms.type, LDP.terms.Container),
    ))).toBeTruthy();
    expect(response.getHeaders().link).toContain(`<${LDP.Container}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${BASE}/.acl>; rel="acl"`);
    // This is only here because we're accessing the root container
    expect(response.getHeaders().link).toContain(`<${PIM.Storage}>; rel="type"`);
  });

  it('can read a folder listing with a query string.', async():
  Promise<void> => {
    const response = await resourceHelper.getResource(`${BASE}/?abc=def&xyz`);
    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()).toHaveProperty('content-type', 'text/turtle');

    const parser = new Parser({ baseIRI: `${BASE}/` });
    const quads = parser.parse(response._getData().toString());
    expect(quads.some((entry): boolean => entry.equals(
      quad(namedNode(`${BASE}/`), RDF.terms.type, LDP.terms.Container),
    ))).toBeTruthy();
    expect(response.getHeaders().link).toContain(`<${LDP.Container}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${BASE}/.acl>; rel="acl"`);
    expect(response.getHeaders().link).toContain(`<${PIM.Storage}>; rel="type"`);
  });

  it('can add a file to the store, read it and delete it.', async():
  Promise<void> => {
    const filePath = 'testfile0.txt';
    const fileUrl = `${BASE}/${filePath}`;
    // PUT
    let response = await resourceHelper.createResource(
      '../assets/testfile0.txt', filePath, 'text/plain',
    );

    // GET
    response = await resourceHelper.getResource(fileUrl);
    expect(response.statusCode).toBe(200);
    expect(response._getBuffer().toString()).toContain('TESTFILE0');
    expect(response.getHeaders().link).toContain(`<${LDP.Resource}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${fileUrl}.acl>; rel="acl"`);
    expect(response.getHeaders()['accept-patch']).toBe('application/sparql-update');
    expect(response.getHeaders()['ms-author-via']).toBe('SPARQL');

    // DELETE
    await resourceHelper.deleteResource(fileUrl);
    await resourceHelper.shouldNotExist(fileUrl);
  });

  it('can add and overwrite a file.', async(): Promise<void> => {
    const filePath = 'file.txt';
    const fileUrl = `${BASE}/${filePath}`;
    // PUT
    let response = await resourceHelper.createResource(
      '../assets/testfile0.txt', filePath, 'text/plain',
    );

    // GET
    response = await resourceHelper.getResource(fileUrl);
    expect(response.statusCode).toBe(200);
    expect(response._getBuffer().toString()).toContain('TESTFILE0');
    expect(response.getHeaders().link).toContain(`<${LDP.Resource}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${fileUrl}.acl>; rel="acl"`);

    // PUT
    response = await resourceHelper.replaceResource(
      '../assets/testfile1.txt', fileUrl, 'text/plain',
    );

    // GET
    response = await resourceHelper.getResource(fileUrl);
    expect(response.statusCode).toBe(200);
    expect(response._getBuffer().toString()).toContain('TESTFILE1');
    expect(response.getHeaders().link).toContain(`<${LDP.Resource}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${fileUrl}.acl>; rel="acl"`);

    // DELETE
    await resourceHelper.deleteResource(fileUrl);
    await resourceHelper.shouldNotExist(fileUrl);
  });

  it('can create a folder and delete it.', async(): Promise<void> => {
    const containerPath = 'secondfolder/';
    const containerUrl = `${BASE}/${containerPath}`;
    // PUT
    let response = await resourceHelper.createContainer(containerPath);

    // GET
    response = await resourceHelper.getContainer(containerUrl);
    expect(response.statusCode).toBe(200);
    expect(response.getHeaders().link).toContain(`<${LDP.Container}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${LDP.BasicContainer}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${LDP.Resource}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${containerUrl}.acl>; rel="acl"`);

    // DELETE
    await resourceHelper.deleteResource(containerUrl);
    await resourceHelper.shouldNotExist(containerUrl);
  });

  it('can make a folder and put a file in it.', async(): Promise<void> => {
    // Create folder
    const containerPath = 'testfolder0/';
    const containerUrl = `${BASE}/${containerPath}`;
    await resourceHelper.createContainer(containerPath);

    // Create file
    const filePath = 'testfolder0/testfile0.txt';
    const fileUrl = `${BASE}/${filePath}`;
    let response = await resourceHelper.createResource(
      '../assets/testfile0.txt', filePath, 'text/plain',
    );

    // GET File
    response = await resourceHelper.getResource(fileUrl);
    expect(response.statusCode).toBe(200);
    expect(response.getHeaders().link).toContain(`<${LDP.Resource}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${fileUrl}.acl>; rel="acl"`);

    // DELETE
    await resourceHelper.deleteResource(fileUrl);
    await resourceHelper.shouldNotExist(fileUrl);
    await resourceHelper.deleteResource(containerUrl);
    await resourceHelper.shouldNotExist(containerUrl);
  });

  it('cannot remove a folder when the folder contains a file.', async(): Promise<void> => {
    // Create folder
    const containerPath = 'testfolder1/';
    const containerUrl = `${BASE}/${containerPath}`;
    let response = await resourceHelper.createContainer(containerPath);

    // Create file
    const filePath = 'testfolder1/testfile0.txt';
    const fileUrl = `${BASE}/${filePath}`;
    await resourceHelper.createResource(
      '../assets/testfile0.txt', filePath, 'text/plain',
    );

    // Try DELETE folder
    response = await resourceHelper.performRequest(new URL(containerUrl), 'DELETE', {});
    expect(response.statusCode).toBe(409);
    expect(response._getData()).toContain('ConflictHttpError: Can only delete empty containers.');

    // DELETE
    await resourceHelper.deleteResource(fileUrl);
    await resourceHelper.shouldNotExist(fileUrl);
    await resourceHelper.deleteResource(containerUrl);
    await resourceHelper.shouldNotExist(containerUrl);
  });

  it('cannot remove a folder when the folder contains a subfolder.', async(): Promise<void> => {
    // Create folder
    const containerPath = 'testfolder2/';
    const containerUrl = `${BASE}/${containerPath}`;
    let response = await resourceHelper.createContainer(containerPath);

    // Create subfolder
    const subContainerPath = `${containerPath}subfolder0/`;
    const subContainerUrl = `${BASE}/${subContainerPath}`;
    response = await resourceHelper.createContainer(subContainerPath);

    // Try DELETE folder
    response = await resourceHelper.performRequest(new URL(containerUrl), 'DELETE', {});
    expect(response.statusCode).toBe(409);
    expect(response._getData()).toContain('ConflictHttpError: Can only delete empty containers.');

    // DELETE
    await resourceHelper.deleteResource(subContainerUrl);
    await resourceHelper.shouldNotExist(subContainerUrl);
    await resourceHelper.deleteResource(containerUrl);
    await resourceHelper.shouldNotExist(containerUrl);
  });

  it('can read the contents of a folder.', async(): Promise<void> => {
    // Create folder
    const containerPath = 'testfolder3/';
    const containerUrl = `${BASE}/${containerPath}`;
    let response = await resourceHelper.createContainer(containerPath);

    // Create subfolder
    const subContainerPath = `${containerPath}subfolder0/`;
    const subContainerUrl = `${BASE}/${subContainerPath}`;
    response = await resourceHelper.createContainer('testfolder3/subfolder0/');

    // Create file
    const filePath = `${containerPath}testfile0.txt`;
    const fileUrl = `${BASE}/${filePath}`;
    response = await resourceHelper.createResource(
      '../assets/testfile0.txt', filePath, 'text/plain',
    );

    response = await resourceHelper.getContainer(containerUrl);
    expect(response.statusCode).toBe(200);
    expect(response._getData()).toContain(`<http://www.w3.org/ns/ldp#contains> <${subContainerUrl}> .`);
    expect(response._getData()).toContain(`<http://www.w3.org/ns/ldp#contains> <${fileUrl}> .`);
    expect(response.getHeaders().link).toContain(`<${LDP.Container}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${LDP.BasicContainer}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${LDP.Resource}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${containerUrl}.acl>; rel="acl"`);

    // DELETE
    await resourceHelper.deleteResource(fileUrl);
    await resourceHelper.shouldNotExist(fileUrl);
    await resourceHelper.deleteResource(subContainerUrl);
    await resourceHelper.shouldNotExist(subContainerUrl);
    await resourceHelper.deleteResource(containerUrl);
    await resourceHelper.shouldNotExist(containerUrl);
  });

  it('can upload and delete a image.', async(): Promise<void> => {
    const filePath = 'image.png';
    const fileUrl = `${BASE}/${filePath}`;
    let response = await resourceHelper.createResource(
      '../assets/testimage.png', filePath, 'image/png',
    );

    // GET
    response = await resourceHelper.getResource(fileUrl);
    expect(response.statusCode).toBe(200);
    expect(response._getHeaders()['content-type']).toBe('image/png');

    // DELETE
    await resourceHelper.deleteResource(fileUrl);
    await resourceHelper.shouldNotExist(fileUrl);
  });

  it('can create a container with a diamond identifier in the data.', async(): Promise<void> => {
    const slug = 'my-container';

    let response: MockResponse<any> = await resourceHelper.performRequestWithBody(
      new URL(ensureTrailingSlash(BASE)),
      'POST',
      {
        'content-type': 'text/turtle',
        'transfer-encoding': 'chunked',
        link: '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
        slug,
      },
      Buffer.from('<> <http://www.w3.org/2000/01/rdf-schema#label> "My Container" .', 'utf-8'),
    );

    expect(response.statusCode).toBe(201);
    expect(response._getHeaders().location).toBe(`${BASE}/${slug}/`);

    response = await resourceHelper.performRequest(new URL(`${BASE}/${slug}/`), 'GET', { accept: 'text/turtle' });
    expect(response.statusCode).toBe(200);

    const parser = new Parser({ baseIRI: `${BASE}/${slug}/` });
    const quads = parser.parse(response._getData());
    expect(quads.some((entry): boolean => entry.equals(quad(
      namedNode(`${BASE}/${slug}/`),
      namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
      literal('My Container'),
    )))).toBeTruthy();
  });
});
