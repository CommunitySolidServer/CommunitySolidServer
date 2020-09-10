import { promises as fs } from 'fs';
import * as url from 'url';
import { MockResponse } from 'node-mocks-http';
import { FileResourceStoreConfig } from '../configs/FileResourceStoreConfig';
import { call, callFile } from '../util/Util';

describe('A server using a FileResourceStore', (): void => {
  describe('without acl', (): void => {
    const config = new FileResourceStoreConfig();
    const handler = config.getHttpHandler();

    it('can add a file to the store, read it and delete it.', async(): Promise<
    void
    > => {
      // POST
      let requestUrl = new URL('http://test.com/');

      const fileData = await fs.readFile('test/assets/testfile0.txt');

      let response: MockResponse<any> = await callFile(
        handler,
        requestUrl,
        'POST',
        { 'content-type': 'application/octet-stream', slug: 'testfile0.txt', 'transfer-encoding': 'chunked' },
        fileData,
      );

      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      const id = response._getHeaders().location;
      expect(id).toContain(url.format(requestUrl));

      // GET
      requestUrl = new URL(id);
      response = await call(handler, requestUrl, 'GET', { accept: 'text/*' }, []);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);
      expect(response._getBuffer().toString()).toContain('TESTFILE0');

      // DELETE
      response = await call(handler, requestUrl, 'DELETE', {}, []);
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));

      // GET
      response = await call(handler, requestUrl, 'GET', { accept: 'text/*' }, []);
      expect(response.statusCode).toBe(404);
      expect(response._getData()).toContain('NotFoundHttpError');
    });

    it('can add and overwrite a file.', async(): Promise<
    void
    > => {
      // POST
      let requestUrl = new URL('http://test.com/');

      let fileData = await fs.readFile('test/assets/testfile0.txt');

      let response: MockResponse<any> = await callFile(
        handler,
        requestUrl,
        'POST',
        { 'content-type': 'application/octet-stream', slug: 'testfile0.txt', 'transfer-encoding': 'chunked' },
        fileData,
      );

      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      const id = response._getHeaders().location;
      expect(id).toContain(url.format(requestUrl));

      // GET
      requestUrl = new URL(id);
      response = await call(handler, requestUrl, 'GET', { accept: 'text/*' }, []);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);
      expect(response._getBuffer().toString()).toContain('TESTFILE0');

      // PUT
      fileData = await fs.readFile('test/assets/testfile1.txt');
      response = await callFile(
        handler,
        requestUrl,
        'PUT',
        { 'content-type': 'application/octet-stream', 'transfer-encoding': 'chunked' },
        fileData,
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));

      // GET
      requestUrl = new URL(id);
      response = await call(handler, requestUrl, 'GET', { accept: 'text/*' }, []);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);
      expect(response._getBuffer().toString()).toContain('TESTFILE1');

      // DELETE
      response = await call(handler, requestUrl, 'DELETE', {}, []);
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));

      // GET
      response = await call(handler, requestUrl, 'GET', { accept: 'text/*' }, []);
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
      response = await call(handler, requestUrl, 'GET', { accept: 'text/turtle' }, []);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);

      // DELETE
      response = await call(handler, requestUrl, 'DELETE', {}, []);
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));

      // GET
      response = await call(handler, requestUrl, 'GET', { accept: 'text/turtle' }, []);
      expect(response.statusCode).toBe(404);
      expect(response._getData()).toContain('NotFoundHttpError');
    });

    it('can make a folder and put a file in it.', async(): Promise<void> => {
      // POST
      let requestUrl = new URL('http://test.com');

      // Create folder
      let response: MockResponse<any> = await callFile(
        handler,
        requestUrl,
        'POST',
        {
          'content-type': 'application/octet-stream',
          slug: 'testfolder0/',
          link: '<http://www.w3.org/ns/ldp#Container>; rel"type"',
          'transfer-encoding': 'chunked',
        },
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      let id = response._getHeaders().location;
      expect(id).toContain(url.format(requestUrl));

      // Create file
      const fileData = await fs.readFile('test/assets/testfile0.txt');
      response = await callFile(
        handler,
        requestUrl,
        'POST',
        {
          'content-type': 'application/octet-stream',
          slug: 'testfolder0/testfile0.txt',
          'transfer-encoding': 'chunked',
        },
        fileData,
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      id = response._getHeaders().location;
      expect(id).toContain(url.format(requestUrl));

      // GET File
      requestUrl = new URL(id);
      response = await call(handler, requestUrl, 'GET', { accept: 'text/plain' }, []);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);

      // DELETE File
      response = await call(handler, requestUrl, 'DELETE', {}, []);
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));

      // GET File again
      response = await call(handler, requestUrl, 'GET', { accept: 'text/plain' }, []);
      expect(response.statusCode).toBe(404);
      expect(response._getData()).toContain('NotFoundHttpError');

      // DELETE folder
      requestUrl = new URL('http://test.com/testfolder0/');
      response = await call(handler, requestUrl, 'DELETE', {}, []);
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));

      // GET folder
      response = await call(handler, requestUrl, 'GET', { accept: 'text/turtle' }, []);
      expect(response.statusCode).toBe(404);
      expect(response._getData()).toContain('NotFoundHttpError');
    });

    it('cannot remove a folder when the folder contains a file.', async(): Promise<void> => {
      // POST
      let requestUrl = new URL('http://test.com');

      // Create folder
      let response: MockResponse<any> = await callFile(
        handler,
        requestUrl,
        'POST',
        {
          'content-type': 'application/octet-stream',
          slug: 'testfolder0/',
          link: '<http://www.w3.org/ns/ldp#Container>; rel"type"',
          'transfer-encoding': 'chunked',
        },
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      let id = response._getHeaders().location;
      expect(id).toContain(url.format(requestUrl));

      // Create file
      const fileData = await fs.readFile('test/assets/testfile0.txt');
      response = await callFile(
        handler,
        requestUrl,
        'POST',
        {
          'content-type': 'application/octet-stream',
          slug: 'testfolder0/testfile0.txt',
          'transfer-encoding': 'chunked',
        },
        fileData,
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      id = response._getHeaders().location;
      expect(id).toContain(url.format(requestUrl));

      // Try DELETE folder
      requestUrl = new URL('http://test.com/testfolder0/');
      response = await call(handler, requestUrl, 'DELETE', {}, []);
      expect(response.statusCode).toBe(409);
      expect(response._getData()).toContain('ConflictHttpError: Container is not empty.')

      // DELETE File
      requestUrl = new URL('http://test.com/testfolder0/testfile0.txt');
      response = await call(handler, requestUrl, 'DELETE', {}, []);
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));

      // DELETE FOLDER
      requestUrl = new URL('http://test.com/testfolder0/');
      response = await call(handler, requestUrl, 'DELETE', {}, []);
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));
    });

    it('can upload and delete a image.', async(): Promise<void> => {
      let requestUrl = new URL('http://test.com');

      // POST
      const fileData = await fs.readFile('test/assets/testimage.png');
      let response = await callFile(
        handler,
        requestUrl,
        'POST',
        {
          'content-type': 'application/octet-stream',
          slug: 'image.png',
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
      response = await call(handler, requestUrl, 'GET', { accept: 'image/png' }, []);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);
      expect(response._getHeaders()['content-type']).toBe('image/png');

      // DELETE
      response = await call(handler, requestUrl, 'DELETE', {}, []);
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));

      // GET
      response = await call(handler, requestUrl, 'GET', { accept: 'image/png' }, []);
      expect(response.statusCode).toBe(404);
      expect(response._getData()).toContain('NotFoundHttpError');
    });
  });
});
