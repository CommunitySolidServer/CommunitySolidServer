import * as url from 'url';
import { namedNode, quad } from '@rdfjs/data-model';
import { Parser } from 'n3';
import { MockResponse } from 'node-mocks-http';
import { UnsecureWebIdExtractor } from '../../src/authentication/UnsecureWebIdExtractor';
import { AllowEverythingAuthorizer } from '../../src/authorization/AllowEverythingAuthorizer';
import { RuntimeConfig } from '../../src/init/RuntimeConfig';
import { AuthenticatedLdpHandler } from '../../src/ldp/AuthenticatedLdpHandler';
import { AcceptPreferenceParser } from '../../src/ldp/http/AcceptPreferenceParser';
import { BasicRequestParser } from '../../src/ldp/http/BasicRequestParser';
import { BasicResponseWriter } from '../../src/ldp/http/BasicResponseWriter';
import { BasicTargetExtractor } from '../../src/ldp/http/BasicTargetExtractor';
import { BodyParser } from '../../src/ldp/http/BodyParser';
import { RawBodyParser } from '../../src/ldp/http/RawBodyParser';
import { SparqlUpdateBodyParser } from '../../src/ldp/http/SparqlUpdateBodyParser';
import { DeleteOperationHandler } from '../../src/ldp/operations/DeleteOperationHandler';
import { GetOperationHandler } from '../../src/ldp/operations/GetOperationHandler';
import { Operation } from '../../src/ldp/operations/Operation';
import { PatchOperationHandler } from '../../src/ldp/operations/PatchOperationHandler';
import { PostOperationHandler } from '../../src/ldp/operations/PostOperationHandler';
import { ResponseDescription } from '../../src/ldp/operations/ResponseDescription';
import { BasePermissionsExtractor } from '../../src/ldp/permissions/BasePermissionsExtractor';
import { SparqlPatchPermissionsExtractor } from '../../src/ldp/permissions/SparqlPatchPermissionsExtractor';
import { Representation } from '../../src/ldp/representation/Representation';
import { HttpRequest } from '../../src/server/HttpRequest';
import { QuadToTurtleConverter } from '../../src/storage/conversion/QuadToTurtleConverter';
import { TurtleToQuadConverter } from '../../src/storage/conversion/TurtleToQuadConverter';
import { InMemoryResourceStore } from '../../src/storage/InMemoryResourceStore';
import { SparqlUpdatePatchHandler } from '../../src/storage/patch/SparqlUpdatePatchHandler';
import { PatchingStore } from '../../src/storage/PatchingStore';
import { RepresentationConvertingStore } from '../../src/storage/RepresentationConvertingStore';
import { SingleThreadedResourceLocker } from '../../src/storage/SingleThreadedResourceLocker';
import { CompositeAsyncHandler } from '../../src/util/CompositeAsyncHandler';
import { call } from '../util/Util';

describe('An integrated AuthenticatedLdpHandler', (): void => {
  describe('with simple handlers', (): void => {
    const requestParser = new BasicRequestParser({
      targetExtractor: new BasicTargetExtractor(),
      preferenceParser: new AcceptPreferenceParser(),
      bodyParser: new RawBodyParser(),
    });

    const credentialsExtractor = new UnsecureWebIdExtractor();
    const permissionsExtractor = new BasePermissionsExtractor();
    const authorizer = new AllowEverythingAuthorizer();

    const store = new InMemoryResourceStore(new RuntimeConfig({ base: 'http://test.com/' }));
    const operationHandler = new CompositeAsyncHandler<Operation, ResponseDescription>([
      new GetOperationHandler(store),
      new PostOperationHandler(store),
      new DeleteOperationHandler(store),
    ]);

    const responseWriter = new BasicResponseWriter();

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
      new SparqlUpdateBodyParser(),
      new RawBodyParser(),
    ]);
    const requestParser = new BasicRequestParser({
      targetExtractor: new BasicTargetExtractor(),
      preferenceParser: new AcceptPreferenceParser(),
      bodyParser,
    });

    const credentialsExtractor = new UnsecureWebIdExtractor();
    const permissionsExtractor = new CompositeAsyncHandler([
      new BasePermissionsExtractor(),
      new SparqlPatchPermissionsExtractor(),
    ]);
    const authorizer = new AllowEverythingAuthorizer();

    const store = new InMemoryResourceStore(new RuntimeConfig({ base: 'http://test.com/' }));
    const converter = new CompositeAsyncHandler([
      new QuadToTurtleConverter(),
      new TurtleToQuadConverter(),
    ]);
    const convertingStore = new RepresentationConvertingStore(store, converter);
    const locker = new SingleThreadedResourceLocker();
    const patcher = new SparqlUpdatePatchHandler(convertingStore, locker);
    const patchingStore = new PatchingStore(convertingStore, patcher);

    const operationHandler = new CompositeAsyncHandler<Operation, ResponseDescription>([
      new GetOperationHandler(patchingStore),
      new PostOperationHandler(patchingStore),
      new DeleteOperationHandler(patchingStore),
      new PatchOperationHandler(patchingStore),
    ]);

    const responseWriter = new BasicResponseWriter();

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
