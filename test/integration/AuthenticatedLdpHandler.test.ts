import * as url from 'url';
import { namedNode, quad } from '@rdfjs/data-model';
import { Parser } from 'n3';
import type { MockResponse } from 'node-mocks-http';
import { BasicConfig } from '../configs/BasicConfig';
import { BasicHandlersConfig } from '../configs/BasicHandlersConfig';
import { call } from '../util/Util';

describe('An integrated AuthenticatedLdpHandler', (): void => {
  describe('with simple handlers', (): void => {
    const handler = new BasicConfig().getHttpHandler();

    it('can add, read and delete data based on incoming requests.', async(): Promise<void> => {
      // POST
      let requestUrl = new URL('http://test.com/');
      let response: MockResponse<any> = await call(
        handler,
        requestUrl,
        'POST',
        { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
        [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
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
      expect(response._getData()).toContain(
        '<http://test.com/s> <http://test.com/p> <http://test.com/o>.',
      );
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

  describe('with simple PATCH handlers', (): void => {
    const handler = new BasicHandlersConfig().getHttpHandler();

    it('can handle simple SPARQL updates.', async(): Promise<void> => {
      // POST
      let requestUrl = new URL('http://test.com/');
      let response: MockResponse<any> = await call(
        handler,
        requestUrl,
        'POST',
        { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
        [ '<http://test.com/s1> <http://test.com/p1> <http://test.com/o1>.',
          '<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>.' ],
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      const id = response._getHeaders().location;
      expect(id).toContain(url.format(requestUrl));

      // PATCH
      requestUrl = new URL(id);
      response = await call(
        handler,
        requestUrl,
        'PATCH',
        { 'content-type': 'application/sparql-update', 'transfer-encoding': 'chunked' },
        [ 'DELETE { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1> }',
          'INSERT {<http://test.com/s3> <http://test.com/p3> <http://test.com/o3>}',
          'WHERE {}',
        ],
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(id);

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
      expect(response._getBuffer().toString()).toContain(
        '<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>.',
      );
      expect(response._getHeaders().location).toBe(id);
      const parser = new Parser();
      const triples = parser.parse(response._getBuffer().toString());
      expect(triples).toBeRdfIsomorphic([
        quad(
          namedNode('http://test.com/s2'),
          namedNode('http://test.com/p2'),
          namedNode('http://test.com/o2'),
        ),
        quad(
          namedNode('http://test.com/s3'),
          namedNode('http://test.com/p3'),
          namedNode('http://test.com/o3'),
        ),
      ]);
    });
  });

  describe('with simple PUT handlers', (): void => {
    const handler = new BasicHandlersConfig().getHttpHandler();

    it('should overwrite the content on PUT request.', async(): Promise<void> => {
      // POST
      let requestUrl = new URL('http://test.com/');
      let response: MockResponse<any> = await call(
        handler,
        requestUrl,
        'POST',
        { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
        [
          '<http://test.com/s1> <http://test.com/p1> <http://test.com/o1>.',
          '<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>.',
        ],
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      const id = response._getHeaders().location;
      expect(id).toContain(url.format(requestUrl));

      // PUT
      requestUrl = new URL(id);
      response = await call(
        handler,
        requestUrl,
        'PUT',
        { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
        [ '<http://test.com/s3> <http://test.com/p3> <http://test.com/o3>.' ],
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(id);

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
      const parser = new Parser();
      const triples = parser.parse(response._getData());
      expect(triples).toBeRdfIsomorphic([
        quad(
          namedNode('http://test.com/s3'),
          namedNode('http://test.com/p3'),
          namedNode('http://test.com/o3'),
        ),
      ]);
    });
  });
});
