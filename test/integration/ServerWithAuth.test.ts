import type { MockResponse } from 'node-mocks-http';
import type { HttpHandler, Initializer, ResourceStore } from '../../src/';
import { AclHelper } from '../util/TestHelpers';
import { performRequest } from '../util/Util';
import { BASE, instantiateFromConfig } from './Config';

describe('A server with authorization', (): void => {
  let handler: HttpHandler;
  let aclHelper: AclHelper;

  beforeAll(async(): Promise<void> => {
    // Set up the internal store
    const variables: Record<string, any> = {
      'urn:solid-server:default:variable:baseUrl': BASE,
    };
    const internalStore = await instantiateFromConfig(
      'urn:solid-server:default:MemoryResourceStore',
      'ldp-with-auth.json',
      variables,
    ) as ResourceStore;
    variables['urn:solid-server:default:variable:store'] = internalStore;

    // Create and initialize the HTTP handler and related components
    let initializer: Initializer;
    let store: ResourceStore;
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      'ldp-with-auth.json',
      variables,
    ) as Record<string, any>;
    ({ handler, store, initializer } = instances);
    await initializer.handleSafe();

    // Create test helpers for manipulating the components
    aclHelper = new AclHelper(store, BASE);
  });

  it('can create new entries.', async(): Promise<void> => {
    await aclHelper.setSimpleAcl({ read: true, write: true, append: true, control: false }, 'agent');

    // POST
    let requestUrl = new URL('http://test.com/');
    let response: MockResponse<any> = await performRequest(
      handler,
      requestUrl,
      'POST',
      { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
    expect(response.statusCode).toBe(201);

    // PUT
    requestUrl = new URL('http://test.com/foo/bar');
    response = await performRequest(
      handler,
      requestUrl,
      'PUT',
      { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
    expect(response.statusCode).toBe(205);
  });

  it('cannot create new entries if not allowed.', async(): Promise<void> => {
    await aclHelper.setSimpleAcl({ read: true, write: true, append: true, control: false }, 'authenticated');

    // POST
    let requestUrl = new URL('http://test.com/');
    let response: MockResponse<any> = await performRequest(
      handler,
      requestUrl,
      'POST',
      { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
    expect(response.statusCode).toBe(401);

    // PUT
    requestUrl = new URL('http://test.com/foo/bar');
    response = await performRequest(
      handler,
      requestUrl,
      'PUT',
      { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
    expect(response.statusCode).toBe(401);
  });

  // https://github.com/solid/community-server/issues/498
  it('accepts a GET with Content-Length: 0.', async(): Promise<void> => {
    await aclHelper.setSimpleAcl({ read: true, write: true, append: true, control: false }, 'agent');

    // PUT
    let requestUrl = new URL('http://test.com/foo/bar');
    let response: MockResponse<any> = await performRequest(
      handler,
      requestUrl,
      'PUT',
      { 'content-length': '0', 'content-type': 'text/turtle' },
      [],
    );
    expect(response.statusCode).toBe(205);

    // GET
    requestUrl = new URL('http://test.com/foo/bar');
    response = await performRequest(
      handler,
      requestUrl,
      'GET',
      { 'content-length': '0' },
      [],
    );
    expect(response.statusCode).toBe(200);
    expect(response.getHeaders()['wac-allow']).toBe('user="read write append",public="read write append"');
  });
});
