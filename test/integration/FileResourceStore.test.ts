import { FileResourceStoreConfig } from '../../configs/FileResourceStoreConfig';
import { MockResponse } from 'node-mocks-http';
import { call, callFile } from '../util/Util';
import * as fs from 'fs';
import * as url from 'url';

describe('A server using a FileResourceStore', (): void => {
  describe('with simple handlers', (): void => {
    const handler = new FileResourceStoreConfig().getHandler();

    it('can add a file to the store, and read it.', async(): Promise<
    void
    > => {
      // POST
      let requestUrl = new URL('http://test.com/');

      const fileData = fs.readFileSync('testfiles/testFile.txt');

      let response: MockResponse<any> = await callFile(
        handler,
        requestUrl,
        'POST',
        { 'content-type': 'application/octet-stream', Slug: 'file.txt' },
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

      //      // DELETE
      //      response = await call(handler, requestUrl, 'DELETE', {}, []);
      //      expect(response.statusCode).toBe(200);
      //      expect(response._getData()).toHaveLength(0);
      //      expect(response._getHeaders().location).toBe(url.format(requestUrl));

      //      // GET
      //      response = await call(
      //        handler,
      //        requestUrl,
      //        'GET',
      //        { accept: 'text/turtle' },
      //        [],
      //      );
      //      expect(response.statusCode).toBe(404);
      //      expect(response._getData()).toContain('NotFoundHttpError');
    });
  });
});
