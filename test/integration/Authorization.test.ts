import { MockResponse } from 'node-mocks-http';
import { UnsecureWebIdExtractor } from '../../src/authentication/UnsecureWebIdExtractor';
import { UrlBasedAclManager } from '../../src/authorization/UrlBasedAclManager';
import { WebAclAuthorizer } from '../../src/authorization/WebAclAuthorizer';
import { RuntimeConfig } from '../../src/init/RuntimeConfig';
import { AuthenticatedLdpHandler } from '../../src/ldp/AuthenticatedLdpHandler';
import { AcceptPreferenceParser } from '../../src/ldp/http/AcceptPreferenceParser';
import { BasicRequestParser } from '../../src/ldp/http/BasicRequestParser';
import { BasicResponseWriter } from '../../src/ldp/http/BasicResponseWriter';
import { BasicTargetExtractor } from '../../src/ldp/http/BasicTargetExtractor';
import { BodyParser } from '../../src/ldp/http/BodyParser';
import { RawBodyParser } from '../../src/ldp/http/RawBodyParser';
import { DeleteOperationHandler } from '../../src/ldp/operations/DeleteOperationHandler';
import { GetOperationHandler } from '../../src/ldp/operations/GetOperationHandler';
import { Operation } from '../../src/ldp/operations/Operation';
import { PostOperationHandler } from '../../src/ldp/operations/PostOperationHandler';
import { PutOperationHandler } from '../../src/ldp/operations/PutOperationHandler';
import { ResponseDescription } from '../../src/ldp/operations/ResponseDescription';
import { MethodPermissionsExtractor } from '../../src/ldp/permissions/MethodPermissionsExtractor';
import { QuadToTurtleConverter } from '../../src/storage/conversion/QuadToTurtleConverter';
import { TurtleToQuadConverter } from '../../src/storage/conversion/TurtleToQuadConverter';
import { InMemoryResourceStore } from '../../src/storage/InMemoryResourceStore';
import { RepresentationConvertingStore } from '../../src/storage/RepresentationConvertingStore';
import { UrlContainerManager } from '../../src/storage/UrlContainerManager';
import { CompositeAsyncHandler } from '../../src/util/CompositeAsyncHandler';
import { AclTestHelper } from '../util/TestHelpers';
import { call } from '../util/Util';

describe('A server with authorization', (): void => {
  const bodyParser: BodyParser = new RawBodyParser();
  const requestParser = new BasicRequestParser({
    targetExtractor: new BasicTargetExtractor(),
    preferenceParser: new AcceptPreferenceParser(),
    bodyParser,
  });

  const store = new InMemoryResourceStore(new RuntimeConfig({ base: 'http://test.com/' }));
  const converter = new CompositeAsyncHandler([
    new QuadToTurtleConverter(),
    new TurtleToQuadConverter(),
  ]);
  const convertingStore = new RepresentationConvertingStore(store, converter);

  const credentialsExtractor = new UnsecureWebIdExtractor();
  const permissionsExtractor = new MethodPermissionsExtractor();
  const authorizer = new WebAclAuthorizer(
    new UrlBasedAclManager(),
    new UrlContainerManager(new RuntimeConfig({ base: 'http://test.com/' })),
    convertingStore,
  );

  const operationHandler = new CompositeAsyncHandler<Operation, ResponseDescription>([
    new GetOperationHandler(convertingStore),
    new PostOperationHandler(convertingStore),
    new DeleteOperationHandler(convertingStore),
    new PutOperationHandler(convertingStore),
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

  const aclHelper = new AclTestHelper(convertingStore, 'http://test.com/');

  it('can create new entries.', async(): Promise<void> => {
    await aclHelper.setSimpleAcl({ read: true, write: true, append: true }, 'agent');

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

    // PUT
    requestUrl = new URL('http://test.com/foo/bar');
    response = await call(
      handler,
      requestUrl,
      'PUT',
      { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
    expect(response.statusCode).toBe(200);
  });

  it('can not create new entries if not allowed.', async(): Promise<void> => {
    await aclHelper.setSimpleAcl({ read: true, write: true, append: true }, 'authenticated');

    // POST
    let requestUrl = new URL('http://test.com/');
    let response: MockResponse<any> = await call(
      handler,
      requestUrl,
      'POST',
      { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
    expect(response.statusCode).toBe(401);

    // PUT
    requestUrl = new URL('http://test.com/foo/bar');
    response = await call(
      handler,
      requestUrl,
      'PUT',
      { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
    expect(response.statusCode).toBe(401);
  });
});
