import type { MockResponse } from 'node-mocks-http';
import { RootContainerInitializer } from '../../src/init/RootContainerInitializer';
import { BasicHandlersWithAclConfig } from '../configs/BasicHandlersWithAclConfig';
import { BASE } from '../configs/Util';
import { AclTestHelper } from '../util/TestHelpers';
import { call } from '../util/Util';

describe('A server with authorization', (): void => {
  const config = new BasicHandlersWithAclConfig();
  const handler = config.getHttpHandler();
  const { store } = config;
  const aclHelper = new AclTestHelper(store, 'http://test.com/');

  beforeAll(async(): Promise<void> => {
    // Initialize store
    const initializer = new RootContainerInitializer(BASE, config.store);
    await initializer.handleSafe();
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
