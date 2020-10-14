import { mkdirSync } from 'fs';
import * as rimraf from 'rimraf';
import type { HttpHandler } from '../../src/server/HttpHandler';
import { FileDataAccessor } from '../../src/storage/accessors/FileDataAccessor';
import { InMemoryDataAccessor } from '../../src/storage/accessors/InMemoryDataAccessor';
import { ExtensionBasedMapper } from '../../src/storage/ExtensionBasedMapper';
import { MetadataController } from '../../src/util/MetadataController';
import { DataAccessorBasedConfig } from '../configs/DataAccessorBasedConfig';
import type { ServerConfig } from '../configs/ServerConfig';
import { BASE, getRootFilePath } from '../configs/Util';
import { FileTestHelper } from '../util/TestHelpers';

const fileDataAccessorStore: [string, (rootFilePath: string) => ServerConfig] = [
  'FileDataAccessorBasedStore',
  (rootFilePath: string): ServerConfig => new DataAccessorBasedConfig(BASE,
    new FileDataAccessor(new ExtensionBasedMapper(BASE, rootFilePath), new MetadataController())),
];
const inMemoryDataAccessorStore: [string, (rootFilePath: string) => ServerConfig] = [
  'InMemoryDataAccessorBasedStore',
  (): ServerConfig => new DataAccessorBasedConfig(BASE,
    new InMemoryDataAccessor(BASE, new MetadataController())),
];

const configs = [ fileDataAccessorStore, inMemoryDataAccessorStore ];

describe.each(configs)('A server using a %s', (name, configFn): void => {
  describe('without acl', (): void => {
    let rootFilePath: string;
    let config: ServerConfig;
    let handler: HttpHandler;
    let fileHelper: FileTestHelper;

    beforeAll(async(): Promise<void> => {
      rootFilePath = getRootFilePath(name);
      mkdirSync(rootFilePath, { recursive: true });
      config = configFn(rootFilePath);
      handler = config.getHttpHandler();
      fileHelper = new FileTestHelper(handler, new URL(BASE));
    });

    afterAll(async(): Promise<void> => {
      rimraf.sync(rootFilePath, { glob: false });
    });

    it('can add a file to the store, read it and delete it.', async():
    Promise<void> => {
      // POST
      let response = await fileHelper.createFile('../assets/testfile0.txt', 'testfile0.txt', 'text/plain');
      const id = response._getHeaders().location;

      // GET
      response = await fileHelper.getFile(id);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);
      expect(response._getBuffer().toString()).toContain('TESTFILE0');

      // DELETE
      await fileHelper.deleteFile(id);
      await fileHelper.shouldNotExist(id);
    });

    it('can add and overwrite a file.', async(): Promise<void> => {
      let response = await fileHelper.createFile('../assets/testfile0.txt', 'file.txt', 'text/plain');
      const id = response._getHeaders().location;

      // GET
      response = await fileHelper.getFile(id);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);
      expect(response._getBuffer().toString()).toContain('TESTFILE0');

      // PUT
      response = await fileHelper.overwriteFile('../assets/testfile1.txt', id, 'text/plain');

      // GET
      response = await fileHelper.getFile(id);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);
      expect(response._getBuffer().toString()).toContain('TESTFILE1');

      // DELETE
      await fileHelper.deleteFile(id);
      await fileHelper.shouldNotExist(id);
    });

    it('can create a folder and delete it.', async(): Promise<void> => {
      // POST
      let response = await fileHelper.createFolder('secondfolder/');
      const id = response._getHeaders().location;

      // GET
      response = await fileHelper.getFolder(id);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);

      // DELETE
      await fileHelper.deleteFolder(id);
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
      expect(response._getHeaders().location).toBe(id);

      // DELETE
      await fileHelper.deleteFile(id);
      await fileHelper.shouldNotExist(id);
      await fileHelper.deleteFolder('http://test.com/testfolder0/');
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
      await fileHelper.deleteFile('http://test.com/testfolder1/testfile0.txt');
      await fileHelper.shouldNotExist('http://test.com/testfolder1/testfile0.txt');
      await fileHelper.deleteFolder(folderId);
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
      await fileHelper.deleteFolder(subFolderId);
      await fileHelper.shouldNotExist(subFolderId);
      await fileHelper.deleteFolder(folderId);
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
      expect(response._getHeaders().location).toBe(folderId);
      expect(response._getBuffer().toString()).toContain('<http://www.w3.org/ns/ldp#contains> <http://test.com/testfolder3/subfolder0/> .');
      expect(response._getBuffer().toString()).toContain('<http://www.w3.org/ns/ldp#contains> <http://test.com/testfolder3/testfile0.txt> .');

      // DELETE
      await fileHelper.deleteFile(fileId);
      await fileHelper.shouldNotExist(fileId);
      await fileHelper.deleteFolder(subFolderId);
      await fileHelper.shouldNotExist(subFolderId);
      await fileHelper.deleteFolder(folderId);
      await fileHelper.shouldNotExist(folderId);
    });

    it('can upload and delete a image.', async(): Promise<void> => {
      let response = await fileHelper.createFile('../assets/testimage.png', 'image.png', 'image/png');
      const fileId = response._getHeaders().location;

      // GET
      response = await fileHelper.getFile(fileId);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(fileId);
      expect(response._getHeaders()['content-type']).toBe('image/png');

      // DELETE
      await fileHelper.deleteFile(fileId);
      await fileHelper.shouldNotExist(fileId);
    });
  });
});
