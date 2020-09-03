import { MockResponse } from 'node-mocks-http';
import { SimpleCredentialsExtractor } from '../../src/authentication/SimpleCredentialsExtractor';
import { SimpleAclAuthorizer } from '../../src/authorization/SimpleAclAuthorizer';
import { SimpleExtensionAclManager } from '../../src/authorization/SimpleExtensionAclManager';
import { RuntimeConfig } from '../../src/init/RuntimeConfig';
import { AuthenticatedLdpHandler } from '../../src/ldp/AuthenticatedLdpHandler';
import { AcceptPreferenceParser } from '../../src/ldp/http/AcceptPreferenceParser';
import { BodyParser } from '../../src/ldp/http/BodyParser';
import { SimpleBodyParser } from '../../src/ldp/http/SimpleBodyParser';
import { SimpleRequestParser } from '../../src/ldp/http/SimpleRequestParser';
import { SimpleResponseWriter } from '../../src/ldp/http/SimpleResponseWriter';
import { SimpleTargetExtractor } from '../../src/ldp/http/SimpleTargetExtractor';
import { Operation } from '../../src/ldp/operations/Operation';
import { ResponseDescription } from '../../src/ldp/operations/ResponseDescription';
import { SimpleDeleteOperationHandler } from '../../src/ldp/operations/SimpleDeleteOperationHandler';
import { SimpleGetOperationHandler } from '../../src/ldp/operations/SimpleGetOperationHandler';
import { SimplePostOperationHandler } from '../../src/ldp/operations/SimplePostOperationHandler';
import { SimplePutOperationHandler } from '../../src/ldp/operations/SimplePutOperationHandler';
import { BasePermissionsExtractor } from '../../src/ldp/permissions/BasePermissionsExtractor';
import { QuadToTurtleConverter } from '../../src/storage/conversion/QuadToTurtleConverter';
import { TurtleToQuadConverter } from '../../src/storage/conversion/TurtleToQuadConverter';
import { RepresentationConvertingStore } from '../../src/storage/RepresentationConvertingStore';
import { SimpleResourceStore } from '../../src/storage/SimpleResourceStore';
import { UrlContainerManager } from '../../src/storage/UrlContainerManager';
import { CompositeAsyncHandler } from '../../src/util/CompositeAsyncHandler';
import { call, setAcl } from '../util/Util';

describe('A server with authorization', (): void => {
  const bodyParser: BodyParser = new SimpleBodyParser();
  const requestParser = new SimpleRequestParser({
    targetExtractor: new SimpleTargetExtractor(),
    preferenceParser: new AcceptPreferenceParser(),
    bodyParser,
  });

  const store = new SimpleResourceStore(new RuntimeConfig({ base: 'http://test.com/' }));
  const converter = new CompositeAsyncHandler([
    new QuadToTurtleConverter(),
    new TurtleToQuadConverter(),
  ]);
  const convertingStore = new RepresentationConvertingStore(store, converter);

  const credentialsExtractor = new SimpleCredentialsExtractor();
  const permissionsExtractor = new BasePermissionsExtractor();
  const authorizer = new SimpleAclAuthorizer(
    new SimpleExtensionAclManager(),
    new UrlContainerManager(new RuntimeConfig({ base: 'http://test.com/' })),
    convertingStore,
  );

  const operationHandler = new CompositeAsyncHandler<Operation, ResponseDescription>([
    new SimpleGetOperationHandler(convertingStore),
    new SimplePostOperationHandler(convertingStore),
    new SimpleDeleteOperationHandler(convertingStore),
    new SimplePutOperationHandler(convertingStore),
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

  it('can create new entries.', async(): Promise<void> => {
    await setAcl(convertingStore,
      'http://test.com/',
      { read: true, write: true, append: true },
      true,
      true,
      true,
      undefined,
      'agent');

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

    // PUT
    requestUrl = new URL('http://test.com/foo/bar');
    response = await call(
      handler,
      requestUrl,
      'PUT',
      { 'content-type': 'text/turtle' },
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
    expect(response.statusCode).toBe(200);
  });

  it('can not create new entries if not allowed.', async(): Promise<void> => {
    await setAcl(convertingStore,
      'http://test.com/',
      { read: true, write: true, append: true },
      true,
      true,
      true,
      undefined,
      'authenticated');

    // POST
    let requestUrl = new URL('http://test.com/');
    let response: MockResponse<any> = await call(
      handler,
      requestUrl,
      'POST',
      { 'content-type': 'text/turtle' },
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
    expect(response.statusCode).toBe(401);

    // PUT
    requestUrl = new URL('http://test.com/foo/bar');
    response = await call(
      handler,
      requestUrl,
      'PUT',
      { 'content-type': 'text/turtle' },
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
    expect(response.statusCode).toBe(401);
  });
});
