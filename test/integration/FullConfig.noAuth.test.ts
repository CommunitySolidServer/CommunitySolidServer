import { mkdirSync } from 'fs';
import * as rimraf from 'rimraf';
import type { HttpHandler, Initializer, ResourceStore } from '../../src/';
import { LDP } from '../../src/util/UriConstants';
import { FileTestHelper } from '../util/TestHelpers';
import { BASE, getRootFilePath, instantiateFromConfig } from './Config';

const rootFilePath = getRootFilePath('full-config-no-auth');
const stores: [string, any][] = [
  [ 'in-memory storage', {
    storeUrn: 'urn:solid-server:default:MemoryResourceStore',
    setup: jest.fn(),
    teardown: jest.fn(),
  }],
  [ 'on-disk storage', {
    storeUrn: 'urn:solid-server:default:FileResourceStore',
    setup(): void {
      mkdirSync(rootFilePath, { recursive: true });
    },
    teardown(): void {
      rimraf.sync(rootFilePath, { glob: false });
    },
  }],
];

describe.each(stores)('An LDP handler without auth using %s', (name, { storeUrn, setup, teardown }): void => {
  let handler: HttpHandler;
  let fileHelper: FileTestHelper;

  beforeAll(async(): Promise<void> => {
    // Set up the internal store
    await setup();
    const variables: Record<string, any> = {
      'urn:solid-server:default:variable:baseUrl': BASE,
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };
    const internalStore = await instantiateFromConfig(
      storeUrn,
      'auth-ldp-handler.json',
      variables,
    ) as ResourceStore;
    variables['urn:solid-server:default:variable:store'] = internalStore;

    // Create and initialize the HTTP handler and related components
    let initializer: Initializer;
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      'auth-ldp-handler.json',
      variables,
    ) as Record<string, any>;
    ({ handler, initializer } = instances);
    await initializer.handleSafe();

    // Create test helpers for manipulating the components
    fileHelper = new FileTestHelper(handler, new URL(BASE));
  });

  afterAll(async(): Promise<void> => {
    await teardown();
  });

  it('can add a file to the store, read it and delete it.', async():
  Promise<void> => {
    // POST
    let response = await fileHelper.createFile('../assets/testfile0.txt', 'testfile0.txt', 'text/plain');
    const id = response._getHeaders().location;

    // GET
    response = await fileHelper.getFile(id);
    expect(response.statusCode).toBe(200);
    expect(response._getBuffer().toString()).toContain('TESTFILE0');
    expect(response.getHeaders().link).toBe(`<${LDP.Resource}>; rel="type"`);

    // DELETE
    await fileHelper.deleteResource(id);
    await fileHelper.shouldNotExist(id);
  });

  it('can add and overwrite a file.', async(): Promise<void> => {
    let response = await fileHelper.createFile('../assets/testfile0.txt', 'file.txt', 'text/plain');
    const id = response._getHeaders().location;

    // GET
    response = await fileHelper.getFile(id);
    expect(response.statusCode).toBe(200);
    expect(response._getBuffer().toString()).toContain('TESTFILE0');
    expect(response.getHeaders().link).toBe(`<${LDP.Resource}>; rel="type"`);

    // PUT
    response = await fileHelper.overwriteFile('../assets/testfile1.txt', id, 'text/plain');

    // GET
    response = await fileHelper.getFile(id);
    expect(response.statusCode).toBe(200);
    expect(response._getBuffer().toString()).toContain('TESTFILE1');
    expect(response.getHeaders().link).toBe(`<${LDP.Resource}>; rel="type"`);

    // DELETE
    await fileHelper.deleteResource(id);
    await fileHelper.shouldNotExist(id);
  });

  it('can create a folder and delete it.', async(): Promise<void> => {
    // POST
    let response = await fileHelper.createFolder('secondfolder/');
    const id = response._getHeaders().location;

    // GET
    response = await fileHelper.getFolder(id);
    expect(response.statusCode).toBe(200);
    expect(response.getHeaders().link).toEqual(
      [ `<${LDP.Container}>; rel="type"`, `<${LDP.BasicContainer}>; rel="type"`, `<${LDP.Resource}>; rel="type"` ],
    );

    // DELETE
    await fileHelper.deleteResource(id);
    await fileHelper.shouldNotExist(id);
  });

  it('can make a folder and put a file in it.', async(): Promise<void> => {
    // Create folder
    await fileHelper.createFolder('testfolder0/');

    // Create file
    let response = await fileHelper.createFile('../assets/testfile0.txt', 'testfolder0/testfile0.txt', 'text/plain');
    const id = response._getHeaders().location;

    // GET File
    response = await fileHelper.getFile(id);
    expect(response.statusCode).toBe(200);
    expect(response.getHeaders().link).toBe(`<${LDP.Resource}>; rel="type"`);

    // DELETE
    await fileHelper.deleteResource(id);
    await fileHelper.shouldNotExist(id);
    await fileHelper.deleteResource('http://test.com/testfolder0/');
    await fileHelper.shouldNotExist('http://test.com/testfolder0/');
  });

  it('cannot remove a folder when the folder contains a file.', async(): Promise<void> => {
    // Create folder
    let response = await fileHelper.createFolder('testfolder1/');
    const folderId = response._getHeaders().location;

    // Create file
    await fileHelper.createFile('../assets/testfile0.txt', 'testfolder1/testfile0.txt', 'text/plain');

    // Try DELETE folder
    response = await fileHelper.simpleCall(new URL(folderId), 'DELETE', {});
    expect(response.statusCode).toBe(409);
    expect(response._getData()).toContain('ConflictHttpError: Can only delete empty containers.');

    // DELETE
    await fileHelper.deleteResource('http://test.com/testfolder1/testfile0.txt');
    await fileHelper.shouldNotExist('http://test.com/testfolder1/testfile0.txt');
    await fileHelper.deleteResource(folderId);
    await fileHelper.shouldNotExist(folderId);
  });

  it('cannot remove a folder when the folder contains a subfolder.', async(): Promise<void> => {
    // Create folder
    let response = await fileHelper.createFolder('testfolder2/');
    const folderId = response._getHeaders().location;

    // Create subfolder
    response = await fileHelper.createFolder('testfolder2/subfolder0');
    const subFolderId = response._getHeaders().location;

    // Try DELETE folder
    response = await fileHelper.simpleCall(new URL(folderId), 'DELETE', {});
    expect(response.statusCode).toBe(409);
    expect(response._getData()).toContain('ConflictHttpError: Can only delete empty containers.');

    // DELETE
    await fileHelper.deleteResource(subFolderId);
    await fileHelper.shouldNotExist(subFolderId);
    await fileHelper.deleteResource(folderId);
    await fileHelper.shouldNotExist(folderId);
  });

  it('can read the contents of a folder.', async(): Promise<void> => {
    // Create folder
    let response = await fileHelper.createFolder('testfolder3/');
    const folderId = response._getHeaders().location;

    // Create subfolder
    response = await fileHelper.createFolder('testfolder3/subfolder0/');
    const subFolderId = response._getHeaders().location;

    // Create file
    response = await fileHelper.createFile('../assets/testfile0.txt', 'testfolder3/testfile0.txt', 'text/plain');
    const fileId = response._getHeaders().location;

    response = await fileHelper.getFolder(folderId);
    expect(response.statusCode).toBe(200);
    expect(response._getBuffer().toString()).toContain('<http://www.w3.org/ns/ldp#contains> <http://test.com/testfolder3/subfolder0/> .');
    expect(response._getBuffer().toString()).toContain('<http://www.w3.org/ns/ldp#contains> <http://test.com/testfolder3/testfile0.txt> .');
    expect(response.getHeaders().link).toEqual(
      [ `<${LDP.Container}>; rel="type"`, `<${LDP.BasicContainer}>; rel="type"`, `<${LDP.Resource}>; rel="type"` ],
    );

    // DELETE
    await fileHelper.deleteResource(fileId);
    await fileHelper.shouldNotExist(fileId);
    await fileHelper.deleteResource(subFolderId);
    await fileHelper.shouldNotExist(subFolderId);
    await fileHelper.deleteResource(folderId);
    await fileHelper.shouldNotExist(folderId);
  });

  it('can upload and delete a image.', async(): Promise<void> => {
    let response = await fileHelper.createFile('../assets/testimage.png', 'image.png', 'image/png');
    const fileId = response._getHeaders().location;

    // GET
    response = await fileHelper.getFile(fileId);
    expect(response.statusCode).toBe(200);
    expect(response._getHeaders()['content-type']).toBe('image/png');

    // DELETE
    await fileHelper.deleteResource(fileId);
    await fileHelper.shouldNotExist(fileId);
  });
});
