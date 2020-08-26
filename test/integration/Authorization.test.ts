import { AcceptPreferenceParser } from '../../src/ldp/http/AcceptPreferenceParser';
import { AuthenticatedLdpHandler } from '../../src/ldp/AuthenticatedLdpHandler';
import { BasePermissionsExtractor } from '../../src/ldp/permissions/BasePermissionsExtractor';
import { BodyParser } from '../../src/ldp/http/BodyParser';
import { call } from '../util/Util';
import { CompositeAsyncHandler } from '../../src/util/CompositeAsyncHandler';
import { DATA_TYPE_BINARY } from '../../src/util/ContentTypes';
import { InteractionController } from '../../src/util/InteractionController';
import { MockResponse } from 'node-mocks-http';
import { Operation } from '../../src/ldp/operations/Operation';
import { PermissionSet } from '../../src/ldp/permissions/PermissionSet';
import { QuadToTurtleConverter } from '../../src/storage/conversion/QuadToTurtleConverter';
import { RepresentationConvertingStore } from '../../src/storage/RepresentationConvertingStore';
import { ResourceStore } from '../../src/storage/ResourceStore';
import { ResourceStoreController } from '../../src/util/ResourceStoreController';
import { ResponseDescription } from '../../src/ldp/operations/ResponseDescription';
import { SimpleAclAuthorizer } from '../../src/authorization/SimpleAclAuthorizer';
import { SimpleBodyParser } from '../../src/ldp/http/SimpleBodyParser';
import { SimpleCredentialsExtractor } from '../../src/authentication/SimpleCredentialsExtractor';
import { SimpleDeleteOperationHandler } from '../../src/ldp/operations/SimpleDeleteOperationHandler';
import { SimpleExtensionAclManager } from '../../src/authorization/SimpleExtensionAclManager';
import { SimpleGetOperationHandler } from '../../src/ldp/operations/SimpleGetOperationHandler';
import { SimplePostOperationHandler } from '../../src/ldp/operations/SimplePostOperationHandler';
import { SimplePutOperationHandler } from '../../src/ldp/operations/SimplePutOperationHandler';
import { SimpleRequestParser } from '../../src/ldp/http/SimpleRequestParser';
import { SimpleResourceStore } from '../../src/storage/SimpleResourceStore';
import { SimpleResponseWriter } from '../../src/ldp/http/SimpleResponseWriter';
import { SimpleTargetExtractor } from '../../src/ldp/http/SimpleTargetExtractor';
import streamifyArray from 'streamify-array';
import { TurtleToQuadConverter } from '../../src/storage/conversion/TurtleToQuadConverter';
import { UrlContainerManager } from '../../src/storage/UrlContainerManager';

const setAcl = async(store: ResourceStore, id: string, permissions: PermissionSet, control: boolean,
  access: boolean, def: boolean, agent?: string, agentClass?: 'agent' | 'authenticated'): Promise<void> => {
  const acl: string[] = [
    '@prefix   acl:  <http://www.w3.org/ns/auth/acl#>.\n',
    '@prefix  foaf:  <http://xmlns.com/foaf/0.1/>.\n',
    '<http://test.com/#auth> a acl:Authorization',
  ];

  for (const perm of [ 'Read', 'Append', 'Write', 'Delete' ]) {
    if (permissions[perm.toLowerCase() as keyof PermissionSet]) {
      acl.push(`;\n acl:mode acl:${perm}`);
    }
  }
  if (control) {
    acl.push(';\n acl:mode acl:Control');
  }
  if (access) {
    acl.push(`;\n acl:accessTo <${id}>`);
  }
  if (def) {
    acl.push(`;\n acl:default <${id}>`);
  }
  if (agent) {
    acl.push(`;\n acl:agent <${agent}>`);
  }
  if (agentClass) {
    acl.push(`;\n acl:agentClass ${agentClass === 'agent' ? 'foaf:Agent' : 'foaf:AuthenticatedAgent'}`);
  }

  acl.push('.');

  const representation = {
    data: streamifyArray(acl),
    dataType: DATA_TYPE_BINARY,
    metadata: {
      raw: [],
      profiles: [],
      contentType: 'text/turtle',
    },
  };

  return store.setRepresentation({ path: `${id}.acl` }, representation);
};

describe('A server with authorization', (): void => {
  const bodyParser: BodyParser = new SimpleBodyParser();
  const requestParser = new SimpleRequestParser({
    targetExtractor: new SimpleTargetExtractor(),
    preferenceParser: new AcceptPreferenceParser(),
    bodyParser,
  });

  const store = new SimpleResourceStore(new ResourceStoreController('http://test.com/',
    new InteractionController(),
    new Set([ DATA_TYPE_BINARY ])));
  const converter = new CompositeAsyncHandler([
    new QuadToTurtleConverter(),
    new TurtleToQuadConverter(),
  ]);
  const convertingStore = new RepresentationConvertingStore(store, converter);

  const credentialsExtractor = new SimpleCredentialsExtractor();
  const permissionsExtractor = new BasePermissionsExtractor();
  const authorizer = new SimpleAclAuthorizer(
    new SimpleExtensionAclManager(),
    new UrlContainerManager('http://test.com/'),
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
