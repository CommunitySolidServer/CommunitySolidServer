import { promises as fs } from 'fs';
import * as url from 'url';
import { MockResponse } from 'node-mocks-http';
import { LockingResourceStoreConfig } from '../configs/LockingResourceStoreConfig';
import { call, callFile } from '../util/Util';

describe('A server using a LockingResourceStore', (): void => {
  describe('without acl', (): void => {
    const config = new LockingResourceStoreConfig();
    const handler = config.getHandler();

    it('can add a file to the store, read it and delete it.', async(): Promise<
    void
    > => {
      // POST
      let requestUrl = new URL('http://test.com/');

      const fileData = await fs.readFile('test/testfiles/testfile1.txt');

      let response: MockResponse<any> = await callFile(
        handler,
        requestUrl,
        'POST',
        {
          'content-type': 'application/octet-stream',
          slug: 'lockingtestfile1.txt',
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

    it('can add and overwrite a file.', async(): Promise<void> => {
      // POST
      let requestUrl = new URL('http://test.com/');

      let fileData = await fs.readFile('test/testfiles/testfile1.txt');

      let response: MockResponse<any> = await callFile(
        handler,
        requestUrl,
        'POST',
        {
          'content-type': 'application/octet-stream',
          slug: 'lockingtestfile1.txt',
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

      // PUT
      fileData = await fs.readFile('test/testfiles/testfile3.txt');
      response = await callFile(
        handler,
        requestUrl,
        'PUT',
        {
          'content-type': 'application/octet-stream',
          'transfer-encoding': 'chunked',
        },
        fileData,
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));

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
      expect(response._getBuffer().toString()).toContain('TESTFILE3');

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

    it('can create a folder and delete it.', async(): Promise<void> => {
      // POST
      let requestUrl = new URL('http://test.com');

      let response: MockResponse<any> = await callFile(
        handler,
        requestUrl,
        'POST',
        {
          'content-type': 'application/octet-stream',
          slug: 'secondfolder/',
          link: '<http://www.w3.org/ns/ldp#Container>; rel"type"',
          'transfer-encoding': 'chunked',
        },
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
        { accept: 'text/turtle' },
        [],
      );
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);

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
        { accept: 'text/turtle' },
        [],
      );
      expect(response.statusCode).toBe(404);
      expect(response._getData()).toContain('NotFoundHttpError');
    });
  });
});
