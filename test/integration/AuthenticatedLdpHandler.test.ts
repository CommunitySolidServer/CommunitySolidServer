import { AcceptPreferenceParser } from '../../src/ldp/http/AcceptPreferenceParser';
import { AuthenticatedLdpHandler } from '../../src/ldp/AuthenticatedLdpHandler';
import { BasePermissionsExtractor } from '../../src/ldp/permissions/BasePermissionsExtractor';
import { BodyParser } from '../../src/ldp/http/BodyParser';
import { call } from '../util/Util';
import { CompositeAsyncHandler } from '../../src/util/CompositeAsyncHandler';
import { HttpRequest } from '../../src/server/HttpRequest';
import { MockResponse } from 'node-mocks-http';
import { Operation } from '../../src/ldp/operations/Operation';
import { Parser } from 'n3';
import { PatchingStore } from '../../src/storage/PatchingStore';
import { QuadToTurtleConverter } from '../../src/storage/conversion/QuadToTurtleConverter';
import { Representation } from '../../src/ldp/representation/Representation';
import { RepresentationConvertingStore } from '../../src/storage/RepresentationConvertingStore';
import { ResponseDescription } from '../../src/ldp/operations/ResponseDescription';
import { RuntimeConfig } from '../../src/init/RuntimeConfig';
import { SimpleAuthorizer } from '../../src/authorization/SimpleAuthorizer';
import { SimpleBodyParser } from '../../src/ldp/http/SimpleBodyParser';
import { SimpleCredentialsExtractor } from '../../src/authentication/SimpleCredentialsExtractor';
import { SimpleDeleteOperationHandler } from '../../src/ldp/operations/SimpleDeleteOperationHandler';
import { SimpleGetOperationHandler } from '../../src/ldp/operations/SimpleGetOperationHandler';
import { SimplePatchOperationHandler } from '../../src/ldp/operations/SimplePatchOperationHandler';
import { SimplePostOperationHandler } from '../../src/ldp/operations/SimplePostOperationHandler';
import { SimpleRequestParser } from '../../src/ldp/http/SimpleRequestParser';
import { SimpleResourceStore } from '../../src/storage/SimpleResourceStore';
import { SimpleResponseWriter } from '../../src/ldp/http/SimpleResponseWriter';
import { SimpleSparqlUpdateBodyParser } from '../../src/ldp/http/SimpleSparqlUpdateBodyParser';
import { SimpleSparqlUpdatePatchHandler } from '../../src/storage/patch/SimpleSparqlUpdatePatchHandler';
import { SimpleTargetExtractor } from '../../src/ldp/http/SimpleTargetExtractor';
import { SingleThreadedResourceLocker } from '../../src/storage/SingleThreadedResourceLocker';
import { SparqlPatchPermissionsExtractor } from '../../src/ldp/permissions/SparqlPatchPermissionsExtractor';
import { TurtleToQuadConverter } from '../../src/storage/conversion/TurtleToQuadConverter';
import { namedNode, quad } from '@rdfjs/data-model';
import * as url from 'url';

describe('An integrated AuthenticatedLdpHandler', (): void => {
  describe('with simple handlers', (): void => {
    const requestParser = new SimpleRequestParser({
      targetExtractor: new SimpleTargetExtractor(),
      preferenceParser: new AcceptPreferenceParser(),
      bodyParser: new SimpleBodyParser(),
    });

    const credentialsExtractor = new SimpleCredentialsExtractor();
    const permissionsExtractor = new BasePermissionsExtractor();
    const authorizer = new SimpleAuthorizer();

    const store = new SimpleResourceStore(new RuntimeConfig({ base: 'http://test.com/' }));
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
      let requestUrl = new URL('http://test.com/');
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
      requestUrl = new URL(id);
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
    const permissionsExtractor = new CompositeAsyncHandler([
      new BasePermissionsExtractor(),
      new SparqlPatchPermissionsExtractor(),
    ]);
    const authorizer = new SimpleAuthorizer();

    const store = new SimpleResourceStore(new RuntimeConfig({ base: 'http://test.com/' }));
    const converter = new CompositeAsyncHandler([
      new QuadToTurtleConverter(),
      new TurtleToQuadConverter(),
    ]);
    const convertingStore = new RepresentationConvertingStore(store, converter);
    const locker = new SingleThreadedResourceLocker();
    const patcher = new SimpleSparqlUpdatePatchHandler(convertingStore, locker);
    const patchingStore = new PatchingStore(convertingStore, patcher);

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
      let requestUrl = new URL('http://test.com/');
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
      requestUrl = new URL(id);
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
      requestUrl = new URL(id);
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
