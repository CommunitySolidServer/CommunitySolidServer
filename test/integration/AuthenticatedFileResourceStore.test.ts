import { promises as fs } from 'fs';
import * as url from 'url';
import { MockResponse } from 'node-mocks-http';
import { HttpHandler, ResourceStore } from '../..';
import { AuthenticatedFileResourceStoreConfig } from '../configs/AuthenticatedFileResourceStoreConfig';
import { call, callFile, setAcl } from '../util/Util';

describe('A server using a FileResourceStore', (): void => {
  let config: AuthenticatedFileResourceStoreConfig;
  let handler: HttpHandler;
  let store: ResourceStore;
  beforeAll(
    async(): Promise<void> => {
      config = new AuthenticatedFileResourceStoreConfig();
      handler = config.getHttpHandler();
      ({ store } = config);

      const root = config.runtimeConfig.rootFilepath;
      await fs.copyFile('test/assets/permanent.txt', `${root}/permanent.txt`);
    },
  );
  afterAll(
    async(): Promise<void> => {
      await setAcl(
        store,
        'http://test.com/',
        { read: true, write: true, append: true },
        true,
        true,
        true,
        undefined,
        'agent',
      );

      // Delete permanente file
      const requestUrl = new URL('http://test.com/permanent.txt');
      const response = await call(
        handler,
        requestUrl,
        'DELETE',
        {},
        [],
      );
      expect(response.statusCode).toBe(200);

      // Delete .acl file
      await store.deleteResource({ path: 'http://test.com/.acl' });
    },
  );
  describe('with acl', (): void => {
    it('can add a file to the store, read it and delete it if allowed.', async(): Promise<
    void
    > => {
      await setAcl(
        store,
        'http://test.com/',
        { read: true, write: true, append: true },
        true,
        true,
        true,
        undefined,
        'agent',
      );

      // POST
      let requestUrl = new URL('http://test.com/');

      const fileData = await fs.readFile('test/assets/testfile1.txt');

      let response: MockResponse<any> = await callFile(
        handler,
        requestUrl,
        'POST',
        {
          'content-type': 'application/octet-stream',
          slug: 'testfile1.txt',
          'transfer-encoding': 'chunked',
        },
        fileData,
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      const id = response._getHeaders().location;
      expect(id).toContain(url.format(requestUrl));

      // GET
      requestUrl = new URL(id);
      response = await call(
        handler,
        requestUrl,
        'GET',
        { accept: 'text/*' },
        [],
      );
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);
      expect(response._getBuffer().toString()).toContain('TESTFILE1');

      // DELETE
      response = await call(handler, requestUrl, 'DELETE', {}, []);
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));

      // GET
      response = await call(
        handler,
        requestUrl,
        'GET',
        { accept: 'text/*' },
        [],
      );
      expect(response.statusCode).toBe(404);
      expect(response._getData()).toContain('NotFoundHttpError');
    });

    it('can not add a file to the store if not allowed.', async(): Promise<
    void
    > => {
      await setAcl(
        store,
        'http://test.com/',
        { read: true, write: true, append: true },
        true,
        true,
        true,
        undefined,
        'authenticated',
      );

      // POST
      const requestUrl = new URL('http://test.com/');

      const fileData = await fs.readFile('test/assets/testfile1.txt');

      const response: MockResponse<any> = await callFile(
        handler,
        requestUrl,
        'POST',
        {
          'content-type': 'application/octet-stream',
          slug: 'testfile1.txt',
          'transfer-encoding': 'chunked',
        },
        fileData,
      );
      expect(response.statusCode).toBe(401);
    });

    it('can not add/delete, but only read files if allowed.', async(): Promise<
    void
    > => {
      await setAcl(
        store,
        'http://test.com/',
        { read: true, write: false, append: false },
        true,
        true,
        true,
        undefined,
        'agent',
      );

      // POST
      let requestUrl = new URL('http://test.com/');

      const fileData = await fs.readFile('test/assets/testfile1.txt');

      let response: MockResponse<any> = await callFile(
        handler,
        requestUrl,
        'POST',
        {
          'content-type': 'application/octet-stream',
          slug: 'testfile1.txt',
          'transfer-encoding': 'chunked',
        },
        fileData,
      );
      expect(response.statusCode).toBe(401);

      // GET
      requestUrl = new URL('http://test.com/permanent.txt');
      response = await call(
        handler,
        requestUrl,
        'GET',
        { accept: 'text/*' },
        [],
      );
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(
        'http://test.com/permanent.txt',
      );
      expect(response._getBuffer().toString()).toContain('TEST');

      // DELETE
      response = await call(handler, requestUrl, 'DELETE', {}, []);
      expect(response.statusCode).toBe(401);
    });
  });
});
