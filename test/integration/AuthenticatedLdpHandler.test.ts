import { AcceptPreferenceParser } from '../../src/ldp/http/AcceptPreferenceParser';
import { AuthenticatedLdpHandler } from '../../src/ldp/AuthenticatedLdpHandler';
import { BodyParser } from '../../src/ldp/http/BodyParser';
import { CompositeAsyncHandler } from '../../src/util/CompositeAsyncHandler';
import { EventEmitter } from 'events';
import { HttpHandler } from '../../src/server/HttpHandler';
import { HttpRequest } from '../../src/server/HttpRequest';
import { IncomingHttpHeaders } from 'http';
import { Operation } from '../../src/ldp/operations/Operation';
import { Parser } from 'n3';
import { PatchingStore } from '../../src/storage/PatchingStore';
import { Representation } from '../../src/ldp/representation/Representation';
import { ResponseDescription } from '../../src/ldp/operations/ResponseDescription';
import { SimpleAuthorizer } from '../../src/authorization/SimpleAuthorizer';
import { SimpleBodyParser } from '../../src/ldp/http/SimpleBodyParser';
import { SimpleCredentialsExtractor } from '../../src/authentication/SimpleCredentialsExtractor';
import { SimpleDeleteOperationHandler } from '../../src/ldp/operations/SimpleDeleteOperationHandler';
import { SimpleGetOperationHandler } from '../../src/ldp/operations/SimpleGetOperationHandler';
import { SimplePatchOperationHandler } from '../../src/ldp/operations/SimplePatchOperationHandler';
import { SimplePermissionsExtractor } from '../../src/ldp/permissions/SimplePermissionsExtractor';
import { SimplePostOperationHandler } from '../../src/ldp/operations/SimplePostOperationHandler';
import { SimpleRequestParser } from '../../src/ldp/http/SimpleRequestParser';
import { SimpleResourceStore } from '../../src/storage/SimpleResourceStore';
import { SimpleResponseWriter } from '../../src/ldp/http/SimpleResponseWriter';
import { SimpleSparqlUpdateBodyParser } from '../../src/ldp/http/SimpleSparqlUpdateBodyParser';
import { SimpleSparqlUpdatePatchHandler } from '../../src/storage/patch/SimpleSparqlUpdatePatchHandler';
import { SimpleTargetExtractor } from '../../src/ldp/http/SimpleTargetExtractor';
import { SingleThreadedResourceLocker } from '../../src/storage/SingleThreadedResourceLocker';
import streamifyArray from 'streamify-array';
import { createResponse, MockResponse } from 'node-mocks-http';
import { namedNode, quad } from '@rdfjs/data-model';
import * as url from 'url';

const call = async(handler: HttpHandler, requestUrl: url.URL, method: string,
  headers: IncomingHttpHeaders, data: string[]): Promise<MockResponse<any>> => {
  const request = streamifyArray(data) as HttpRequest;
  request.url = requestUrl.pathname;
  request.method = method;
  request.headers = headers;
  request.headers.host = requestUrl.host;
  const response: MockResponse<any> = createResponse({ eventEmitter: EventEmitter });

  const endPromise = new Promise((resolve): void => {
    response.on('end', (): void => {
      expect(response._isEndCalled()).toBeTruthy();
      resolve();
    });
  });

  await handler.handleSafe({ request, response });
  await endPromise;

  return response;
};

describe('An AuthenticatedLdpHandler', (): void => {
  describe('with simple handlers', (): void => {
    const requestParser = new SimpleRequestParser({
      targetExtractor: new SimpleTargetExtractor(),
      preferenceParser: new AcceptPreferenceParser(),
      bodyParser: new SimpleBodyParser(),
    });

    const credentialsExtractor = new SimpleCredentialsExtractor();
    const permissionsExtractor = new SimplePermissionsExtractor();
    const authorizer = new SimpleAuthorizer();

    const store = new SimpleResourceStore('http://test.com/');
    const operationHandler = new CompositeAsyncHandler<Operation, ResponseDescription>([
      new SimpleGetOperationHandler(store),
      new SimplePostOperationHandler(store),
      new SimpleDeleteOperationHandler(store),
    ]);

    const responseWriter = new SimpleResponseWriter();

    const handler = new AuthenticatedLdpHandler({
      requestParser,
      credentialsExtractor,
      permissionsExtractor,
      authorizer,
      operationHandler,
      responseWriter,
    });

    it('can add, read and delete data based on incoming requests.', async(): Promise<void> => {
      // POST
      let requestUrl = new url.URL('http://test.com/');
      let response: MockResponse<any> = await call(
        handler,
        requestUrl,
        'POST',
        { 'content-type': 'text/turtle' },
        [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      const id = response._getHeaders().location;
      expect(id).toContain(url.format(requestUrl));

      // GET
      requestUrl = new url.URL(id);
      response = await call(handler, requestUrl, 'GET', { accept: 'text/turtle' }, []);
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toContain('<http://test.com/s> <http://test.com/p> <http://test.com/o>.');
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
  });

  describe('with simple PATCH handlers', (): void => {
    const bodyParser: BodyParser = new CompositeAsyncHandler<HttpRequest, Representation | undefined>([
      new SimpleSparqlUpdateBodyParser(),
      new SimpleBodyParser(),
    ]);
    const requestParser = new SimpleRequestParser({
      targetExtractor: new SimpleTargetExtractor(),
      preferenceParser: new AcceptPreferenceParser(),
      bodyParser,
    });

    const credentialsExtractor = new SimpleCredentialsExtractor();
    const permissionsExtractor = new SimplePermissionsExtractor();
    const authorizer = new SimpleAuthorizer();

    const store = new SimpleResourceStore('http://test.com/');
    const locker = new SingleThreadedResourceLocker();
    const patcher = new SimpleSparqlUpdatePatchHandler(store, locker);
    const patchingStore = new PatchingStore(store, patcher);

    const operationHandler = new CompositeAsyncHandler<Operation, ResponseDescription>([
      new SimpleGetOperationHandler(patchingStore),
      new SimplePostOperationHandler(patchingStore),
      new SimpleDeleteOperationHandler(patchingStore),
      new SimplePatchOperationHandler(patchingStore),
    ]);

    const responseWriter = new SimpleResponseWriter();

    const handler = new AuthenticatedLdpHandler({
      requestParser,
      credentialsExtractor,
      permissionsExtractor,
      authorizer,
      operationHandler,
      responseWriter,
    });

    it('can handle simple SPARQL updates.', async(): Promise<void> => {
      // POST
      let requestUrl = new url.URL('http://test.com/');
      let response: MockResponse<any> = await call(
        handler,
        requestUrl,
        'POST',
        { 'content-type': 'text/turtle' },
        [ '<http://test.com/s1> <http://test.com/p1> <http://test.com/o1>.',
          '<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>.' ],
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      const id = response._getHeaders().location;
      expect(id).toContain(url.format(requestUrl));

      // PATCH
      requestUrl = new url.URL(id);
      response = await call(
        handler,
        requestUrl,
        'PATCH',
        { 'content-type': 'application/sparql-update' },
        [ 'DELETE { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1> }',
          'INSERT {<http://test.com/s3> <http://test.com/p3> <http://test.com/o3>}',
          'WHERE {}' ],
      );
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toHaveLength(0);
      expect(response._getHeaders().location).toBe(id);

      // GET
      requestUrl = new url.URL(id);
      response = await call(handler, requestUrl, 'GET', { accept: 'text/turtle' }, []);
      expect(response.statusCode).toBe(200);
      expect(response._getData()).toContain('<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>.');
      expect(response._getHeaders().location).toBe(id);
      const parser = new Parser();
      const triples = parser.parse(response._getData());
      expect(triples).toBeRdfIsomorphic(
        [
          quad(namedNode('http://test.com/s2'), namedNode('http://test.com/p2'), namedNode('http://test.com/o2')),
          quad(namedNode('http://test.com/s3'), namedNode('http://test.com/p3'), namedNode('http://test.com/o3')),
        ],
      );
    });
  });
});
