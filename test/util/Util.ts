import { EventEmitter } from 'events';
import { IncomingHttpHeaders } from 'http';
import { createResponse, MockResponse } from 'node-mocks-http';
import streamifyArray from 'streamify-array';
import { PermissionSet } from '../../src/ldp/permissions/PermissionSet';
import { HttpHandler } from '../../src/server/HttpHandler';
import { HttpRequest } from '../../src/server/HttpRequest';
import { ResourceStore } from '../../src/storage/ResourceStore';

export const call = async(
  handler: HttpHandler,
  requestUrl: URL,
  method: string,
  headers: IncomingHttpHeaders,
  data: string[],
): Promise<MockResponse<any>> => {
  const request = streamifyArray(data) as HttpRequest;
  request.url = requestUrl.pathname;
  request.method = method;
  request.headers = headers;
  request.headers.host = requestUrl.host;
  const response: MockResponse<any> = createResponse({
    eventEmitter: EventEmitter,
  });

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

export const callFile = async(
  handler: HttpHandler,
  requestUrl: URL,
  method: string,
  headers: IncomingHttpHeaders,
  data?: Buffer,
): Promise<MockResponse<any>> => {
  const request = data ?
    (streamifyArray([ data ]) as HttpRequest) :
    streamifyArray([]) as HttpRequest;

  request.url = requestUrl.pathname;
  request.method = method;
  request.headers = headers;
  request.headers.host = requestUrl.host;
  const response: MockResponse<any> = createResponse({
    eventEmitter: EventEmitter,
  });

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

export const setAcl = async(
  store: ResourceStore,
  id: string,
  permissions: PermissionSet,
  control: boolean,
  access: boolean,
  def: boolean,
  agent?: string,
  agentClass?: 'agent' | 'authenticated',
): Promise<void> => {
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
    acl.push(
      `;\n acl:agentClass ${
        agentClass === 'agent' ? 'foaf:Agent' : 'foaf:AuthenticatedAgent'
      }`,
    );
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

export const multipleRequest = async(
  handler: HttpHandler,
  requestUrl: URL,
  methods: string[],
  headers: IncomingHttpHeaders[],
  data: Buffer,
): Promise<void> => {
  call(handler, requestUrl, methods[0], headers[0], [])
    .then(result => console.log(result.statusCode))
    .catch(error => console.log(error));

  callFile(handler, requestUrl, methods[1], headers[1], data)
    .then(result => console.log(result.statusCode))
    .catch(error => console.log(error));
};
