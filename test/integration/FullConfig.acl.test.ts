import { createReadStream, mkdirSync } from 'fs';
import { join } from 'path';
import * as rimraf from 'rimraf';
import { RepresentationMetadata } from '../../src/ldp/representation/RepresentationMetadata';
import { FileDataAccessor } from '../../src/storage/accessors/FileDataAccessor';
import { InMemoryDataAccessor } from '../../src/storage/accessors/InMemoryDataAccessor';
import { ExtensionBasedMapper } from '../../src/storage/ExtensionBasedMapper';
import { MetadataController } from '../../src/util/MetadataController';
import { CONTENT_TYPE, LDP } from '../../src/util/UriConstants';
import { ensureTrailingSlash } from '../../src/util/Util';
import { AuthenticatedDataAccessorBasedConfig } from '../configs/AuthenticatedDataAccessorBasedConfig';
import type { ServerConfig } from '../configs/ServerConfig';
import { BASE, getRootFilePath } from '../configs/Util';
import { AclTestHelper, FileTestHelper } from '../util/TestHelpers';

const dataAccessorStore: [string, (rootFilePath: string) => ServerConfig] = [
  'AuthenticatedFileDataAccessorBasedStore',
  (rootFilePath: string): ServerConfig => new AuthenticatedDataAccessorBasedConfig(BASE,
    new FileDataAccessor(new ExtensionBasedMapper(BASE, rootFilePath), new MetadataController())),
];
const inMemoryDataAccessorStore: [string, (rootFilePath: string) => ServerConfig] = [
  'AuthenticatedInMemoryDataAccessorBasedStore',
  (): ServerConfig => new AuthenticatedDataAccessorBasedConfig(BASE,
    new InMemoryDataAccessor(BASE, new MetadataController())),
];

describe.each([ dataAccessorStore, inMemoryDataAccessorStore ])('A server using a %s', (name, configFn): void => {
  describe('with acl', (): void => {
    let config: ServerConfig;
    let aclHelper: AclTestHelper;
    let fileHelper: FileTestHelper;
    let rootFilePath: string;

    beforeAll(async(): Promise<void> => {
      rootFilePath = getRootFilePath(name);
      mkdirSync(rootFilePath, { recursive: true });
      config = configFn(rootFilePath);
      aclHelper = new AclTestHelper(config.store, ensureTrailingSlash(BASE));
      fileHelper = new FileTestHelper(config.getHttpHandler(), new URL(ensureTrailingSlash(BASE)));

      // Make sure the root directory exists
      mkdirSync(rootFilePath, { recursive: true });

      // Use store instead of file access so tests also work for non-file backends
      await config.store.setRepresentation({ path: `${BASE}/permanent.txt` }, {
        binary: true,
        data: createReadStream(join(__dirname, '../assets/permanent.txt')),
        metadata: new RepresentationMetadata({ [CONTENT_TYPE]: 'text/plain' }),
      });
    });

    afterAll(async(): Promise<void> => {
      rimraf.sync(rootFilePath, { glob: false });
    });

    it('can add a file to the store, read it and delete it if allowed.', async(): Promise<
    void
    > => {
      // Set acl
      await aclHelper.setSimpleAcl({ read: true, write: true, append: true }, 'agent');

      // Create file
      let response = await fileHelper.createFile('../assets/testfile2.txt', 'testfile2.txt', 'text/plain');
      const id = response._getHeaders().location;

      // Get file
      response = await fileHelper.getFile(id);
      expect(response.statusCode).toBe(200);
      expect(response._getBuffer().toString()).toContain('TESTFILE2');
      expect(response.getHeaders().link).toBe(`<${LDP.Resource}>; rel="type"`);

      // DELETE file
      await fileHelper.deleteResource(id);
      await fileHelper.shouldNotExist(id);
    });

    it('can not add a file to the store if not allowed.', async():
    Promise<void> => {
      // Set acl
      await aclHelper.setSimpleAcl({ read: true, write: true, append: true }, 'authenticated');

      // Try to create file
      const response = await fileHelper.createFile('../assets/testfile2.txt', 'testfile2.txt', 'text/plain', true);
      expect(response.statusCode).toBe(401);
    });

    it('can not add/delete, but only read files if allowed.', async():
    Promise<void> => {
      // Set acl
      await aclHelper.setSimpleAcl({ read: true, write: false, append: false }, 'agent');

      // Try to create file
      let response = await fileHelper.createFile('../assets/testfile2.txt', 'testfile2.txt', 'text/plain', true);
      expect(response.statusCode).toBe(401);

      // GET permanent file
      response = await fileHelper.getFile('http://test.com/permanent.txt');
      expect(response._getBuffer().toString()).toContain('TEST');
      expect(response.getHeaders().link).toBe(`<${LDP.Resource}>; rel="type"`);

      // Try to delete permanent file
      response = await fileHelper.deleteResource('http://test.com/permanent.txt', true);
      expect(response.statusCode).toBe(401);
    });
  });
});
