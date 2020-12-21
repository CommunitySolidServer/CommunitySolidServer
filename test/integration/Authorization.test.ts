import type { MockResponse } from 'node-mocks-http';
import type { HttpHandler, Initializer, ResourceStore } from '../../src/';
import { BASE, instantiateFromConfig } from '../configs/Util';
import { AclTestHelper } from '../util/TestHelpers';
import { call } from '../util/Util';

describe('A server with authorization', (): void => {
  let handler: HttpHandler;
  let aclHelper: AclTestHelper;

  beforeAll(async(): Promise<void> => {
    // Set up the internal store
    const variables: Record<string, any> = {
      'urn:solid-server:default:variable:baseUrl': BASE,
    };
    const internalStore = await instantiateFromConfig(
      'urn:solid-server:default:MemoryResourceStore',
      'auth-ldp-handler.json',
      variables,
    ) as ResourceStore;
    variables['urn:solid-server:default:variable:store'] = internalStore;

    // Create and initialize the HTTP handler and related components
    let initializer: Initializer;
    let store: ResourceStore;
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      'auth-ldp-handler.json',
      variables,
    ) as Record<string, any>;
    ({ handler, store, initializer } = instances);
    await initializer.handleSafe();

    // Create test helpers for manipulating the components
    aclHelper = new AclTestHelper(store, BASE);
  });

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
    expect(response.statusCode).toBe(201);

    // PUT
    requestUrl = new URL('http://test.com/foo/bar');
    response = await call(
      handler,
      requestUrl,
      'PUT',
      { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
    expect(response.statusCode).toBe(205);
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
