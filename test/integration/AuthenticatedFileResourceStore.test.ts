import { promises as fs } from 'fs';
import { join } from 'path';
import { HttpHandler, ResourceStore } from '../../index';
import { AuthenticatedFileResourceStoreConfig } from '../configs/AuthenticatedFileResourceStoreConfig';
import { RUNTIMECONFIG } from '../configs/Util';
import { AclTestHelper, FileTestHelper } from '../util/TestHelpers';

describe('A server using a AuthenticatedFileResourceStore', (): void => {
  let config: AuthenticatedFileResourceStoreConfig;
  let handler: HttpHandler;
  let store: ResourceStore;
  let aclHelper: AclTestHelper;
  let fileHelper: FileTestHelper;

  beforeAll(
    async(): Promise<void> => {
      const { base, rootFilepath } = RUNTIMECONFIG;
      config = new AuthenticatedFileResourceStoreConfig();
      handler = config.getHttpHandler();
      ({ store } = config);
      aclHelper = new AclTestHelper(store, base);
      fileHelper = new FileTestHelper(handler, new URL('http://test.com/'));

      // Make sure the root directory exists
      await fs.mkdir(rootFilepath, { recursive: true });
      await fs.copyFile(join(__dirname, '../assets/permanent.txt'), `${rootFilepath}/permanent.txt`);
    },
  );
  describe('with acl', (): void => {
    it('can add a file to the store, read it and delete it if allowed.', async(): Promise<
    void
    > => {
      // Set acl
      await aclHelper.setSimpleAcl({ read: true, write: true, append: true }, 'agent');

      // Create file
      let response = await fileHelper.createFile('../assets/testfile2.txt', 'testfile2.txt');
      const id = response._getHeaders().location;

      // Get file
      response = await fileHelper.getFile(id);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);
      expect(response._getBuffer().toString()).toContain('TESTFILE2');

      // DELETE file
      await fileHelper.deleteFile(id);
      await fileHelper.shouldNotExist(id);
    });

    it('can not add a file to the store if not allowed.', async():
    Promise<void> => {
      // Set acl
      await aclHelper.setSimpleAcl({ read: true, write: true, append: true }, 'authenticated');

      // Try to create file
      const response = await fileHelper.createFile('../assets/testfile2.txt', 'testfile2.txt', true);
      expect(response.statusCode).toBe(401);
    });

    it('can not add/delete, but only read files if allowed.', async():
    Promise<void> => {
      // Set acl
      await aclHelper.setSimpleAcl({ read: true, write: false, append: false }, 'agent');

      // Try to create file
      let response = await fileHelper.createFile('../assets/testfile2.txt', 'testfile2.txt', true);
      expect(response.statusCode).toBe(401);

      // GET permanent file
      response = await fileHelper.getFile('http://test.com/permanent.txt');
      expect(response._getHeaders().location).toBe('http://test.com/permanent.txt');
      expect(response._getBuffer().toString()).toContain('TEST');

      // Try to delete permanent file
      response = await fileHelper.deleteFile('http://test.com/permanent.txt', true);
      expect(response.statusCode).toBe(401);
    });
  });
});
