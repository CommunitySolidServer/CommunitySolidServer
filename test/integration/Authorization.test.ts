import { MockResponse } from 'node-mocks-http';
import streamifyArray from 'streamify-array';
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
import { BasePermissionsExtractor } from '../../src/ldp/permissions/BasePermissionsExtractor';
import { PermissionSet } from '../../src/ldp/permissions/PermissionSet';
import { QuadToTurtleConverter } from '../../src/storage/conversion/QuadToTurtleConverter';
import { TurtleToQuadConverter } from '../../src/storage/conversion/TurtleToQuadConverter';
import { InMemoryResourceStore } from '../../src/storage/InMemoryResourceStore';
import { RepresentationConvertingStore } from '../../src/storage/RepresentationConvertingStore';
import { ResourceStore } from '../../src/storage/ResourceStore';
import { UrlContainerManager } from '../../src/storage/UrlContainerManager';
import { CompositeAsyncHandler } from '../../src/util/CompositeAsyncHandler';
import { call } from '../util/Util';

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
    binary: true,
    data: streamifyArray(acl),
    metadata: {
      raw: [],
      profiles: [],
      contentType: 'text/turtle',
    },
  };

  return store.setRepresentation({ path: `${id}.acl` }, representation);
};

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
  const permissionsExtractor = new BasePermissionsExtractor();
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
