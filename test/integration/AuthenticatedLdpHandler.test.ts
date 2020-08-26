import { call } from '../util/Util';
import { MockResponse } from 'node-mocks-http';
import { Parser } from 'n3';
import { SimplePatchTestConfig } from '../../configs/SimplePatchTestConfig';
import { SimpleTestConfig } from '../../configs/SimpleTestConfig';
import { namedNode, quad } from '@rdfjs/data-model';
import * as url from 'url';

describe('An integrated AuthenticatedLdpHandler', (): void => {
  describe('with simple handlers', (): void => {
    const handler = new SimpleTestConfig(3000).getHandler();

    it('can add, read and delete data based on incoming requests.', async(): Promise<
    void
    > => {
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
    const handler = new SimplePatchTestConfig(3000).getHandler();

    it('can handle simple SPARQL updates.', async(): Promise<void> => {
      // POST
      let requestUrl = new URL('http://test.com/');
      let response: MockResponse<any> = await call(
        handler,
        requestUrl,
        'POST',
        { 'content-type': 'text/turtle' },
        [
          '<http://test.com/s1> <http://test.com/p1> <http://test.com/o1>.',
          '<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>.',
        ],
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
        [
          'DELETE { <http://test.com/s1> <http://test.com/p1> <http://test.com/o1> }',
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
      expect(response._getData()).toContain(
        '<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>.',
      );
      expect(response._getHeaders().location).toBe(id);
      const parser = new Parser();
      const triples = parser.parse(response._getData());
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
    const bodyParser: BodyParser = new CompositeAsyncHandler<
    HttpRequest,
    Representation | undefined
    >([ new SimpleSparqlUpdateBodyParser(), new SimpleBodyParser() ]);
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

    const store = new SimpleResourceStore('http://test.com/');
    const converter = new CompositeAsyncHandler([
      new QuadToTurtleConverter(),
      new TurtleToQuadConverter(),
    ]);
    const convertingStore = new RepresentationConvertingStore(store, converter);
    const locker = new SingleThreadedResourceLocker();
    const patcher = new SimpleSparqlUpdatePatchHandler(convertingStore, locker);
    const patchingStore = new PatchingStore(convertingStore, patcher);

    const operationHandler = new CompositeAsyncHandler<
    Operation,
    ResponseDescription
    >([
      new SimpleGetOperationHandler(patchingStore),
      new SimplePostOperationHandler(patchingStore),
      new SimpleDeleteOperationHandler(patchingStore),
      new SimplePutOperationHandler(patchingStore),
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

    it('should overwrite the content on PUT request.', async(): Promise<void> => {
      // POST
      let requestUrl = new URL('http://test.com/');
      let response: MockResponse<any> = await call(
        handler,
        requestUrl,
        'POST',
        { 'content-type': 'text/turtle' },
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
        { 'content-type': 'text/turtle' },
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
