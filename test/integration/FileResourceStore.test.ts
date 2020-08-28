import { FileResourceStoreConfig } from '../../configs/FileResourceStoreConfig';
import { MockResponse } from 'node-mocks-http';
import { call, callFile } from '../util/Util';
import * as fs from 'fs';
import * as url from 'url';

describe('A server using a FileResourceStore', (): void => {
  describe('without acl', (): void => {
    const handler = new FileResourceStoreConfig().getHandler();

    it('can add a file to the store, read it and delete it.', async(): Promise<
    void
    > => {
      // POST
      let requestUrl = new URL('http://test.com/');

      const fileData = fs.readFileSync('test/testfiles/testfile1.txt');

      let response: MockResponse<any> = await callFile(
        handler,
        requestUrl,
        'POST',
        { 'content-type': 'application/octet-stream', Slug: 'testfile1.txt' },
        fileData,
      );

      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      const id = response._getHeaders().location;
      expect(id).toContain(url.format(requestUrl));

      // GET
      requestUrl = new URL(id);
      response = await call(handler, requestUrl, 'GET', { accept: '*/*' }, []);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);

      // DELETE
      response = await call(handler, requestUrl, 'DELETE', {}, []);
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));

      // GET
      response = await call(handler, requestUrl, 'GET', { accept: '*/*' }, []);
      expect(response.statusCode).toBe(404);
      expect(response._getData()).toContain('NotFoundHttpError');
    });

    it('can add and overwrite a file.', async(): Promise<
    void
    > => {
      // POST
      let requestUrl = new URL('http://test.com/');

      let fileData = fs.readFileSync('test/testfiles/testfile1.txt');

      let response: MockResponse<any> = await callFile(
        handler,
        requestUrl,
        'POST',
        { 'content-type': 'application/octet-stream', Slug: 'testfile1.txt' },
        fileData,
      );

      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      const id = response._getHeaders().location;
      expect(id).toContain(url.format(requestUrl));

      // GET
      requestUrl = new URL(id);
      response = await call(handler, requestUrl, 'GET', { accept: '*/*' }, []);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);

      // PUT
      fileData = fs.readFileSync('test/testfiles/testfile2.txt');
      response = await callFile(
        handler,
        requestUrl,
        'PUT',
        { 'content-type': 'application/octet-stream' },
        fileData,
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));

      // GET
      requestUrl = new URL(id);
      response = await call(handler, requestUrl, 'GET', { accept: '*/*' }, []);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);
      console.log('aa')
      console.log(response._getData())
      console.log('bb')
      expect(response._getData()).toContain('TESTFILE3')

    });

    it('can create a folder and delete it.', async(): Promise<void> => {
      // This tests succeeds but is not good, the metadata Link does not get parsed so the 
      // store does not know that we want to make a folder. The result current reslult is 
      // that a folder gets made with a empty file, this file gets deleted instead
      // of the folder thats why the last GET receives a 200 statuscode
      
      // POST
      let requestUrl = new URL('http://test.com/secondfolder/');

      let response: MockResponse<any> = await callFile(
        handler,
        requestUrl,
        'POST',
        {
          'content-type': 'application/octet-stream',
          Slug: 'secondfolder/',
          Link: '<http://www.w3.org/ns/ldp#Container>; rel"type"',
        },
      );

      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      const id = response._getHeaders().location;
      expect(id).toContain(url.format(requestUrl));

      // GET
      requestUrl = new URL(id);
      response = await call(handler, requestUrl, 'GET', { accept: '*/*' }, []);
      expect(response.statusCode).toBe(200);
      expect(response._getHeaders().location).toBe(id);

      // DELETE
      response = await call(handler, requestUrl, 'DELETE', {}, []);
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(url.format(requestUrl));

      // GET
      response = await call(handler, requestUrl, 'GET', { accept: '*/*' }, []);
      expect(response.statusCode).toBe(404);
      expect(response._getData()).toContain('NotFoundHttpError');
    });
  });



});
