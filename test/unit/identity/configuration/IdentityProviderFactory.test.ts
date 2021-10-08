import type { Configuration } from 'oidc-provider';
import type { ErrorHandler } from '../../../../src/http/output/error/ErrorHandler';
import type { ResponseWriter } from '../../../../src/http/output/ResponseWriter';
import { IdentityProviderFactory } from '../../../../src/identity/configuration/IdentityProviderFactory';
import type { AdapterFactory } from '../../../../src/identity/storage/AdapterFactory';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';

/* eslint-disable @typescript-eslint/naming-convention */
jest.mock('oidc-provider', (): any => ({
  Provider: jest.fn().mockImplementation((issuer: string, config: Configuration): any => ({ issuer, config })),
}));

const routes = {
  authorization: '/foo/idp/auth',
  check_session: '/foo/idp/session/check',
  code_verification: '/foo/idp/device',
  device_authorization: '/foo/idp/device/auth',
  end_session: '/foo/idp/session/end',
  introspection: '/foo/idp/token/introspection',
  jwks: '/foo/idp/jwks',
  pushed_authorization_request: '/foo/idp/request',
  registration: '/foo/idp/reg',
  revocation: '/foo/idp/token/revocation',
  token: '/foo/idp/token',
  userinfo: '/foo/idp/me',
};

describe('An IdentityProviderFactory', (): void => {
  let baseConfig: Configuration;
  const baseUrl = 'http://test.com/foo/';
  const idpPath = '/idp';
  const webId = 'http://alice.test.com/card#me';
  let adapterFactory: jest.Mocked<AdapterFactory>;
  let storage: jest.Mocked<KeyValueStorage<string, any>>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let responseWriter: jest.Mocked<ResponseWriter>;
  let factory: IdentityProviderFactory;

  beforeEach(async(): Promise<void> => {
    baseConfig = { claims: { webid: [ 'webid', 'client_webid' ]}};

    adapterFactory = {
      createStorageAdapter: jest.fn().mockReturnValue('adapter!'),
    };

    const map = new Map();
    storage = {
      get: jest.fn((id: string): any => map.get(id)),
      set: jest.fn((id: string, value: any): any => map.set(id, value)),
    } as any;

    errorHandler = {
      handleSafe: jest.fn().mockResolvedValue({ statusCode: 500 }),
    } as any;

    responseWriter = { handleSafe: jest.fn() } as any;

    factory = new IdentityProviderFactory(baseConfig, {
      adapterFactory,
      baseUrl,
      idpPath,
      storage,
      errorHandler,
      responseWriter,
    });
  });

  it('errors if the idpPath parameter does not start with a slash.', async(): Promise<void> => {
    expect((): any => new IdentityProviderFactory(baseConfig, {
      adapterFactory,
      baseUrl,
      idpPath: 'idp',
      storage,
      errorHandler,
      responseWriter,
    })).toThrow('idpPath needs to start with a /');
  });

  it('creates a correct configuration.', async(): Promise<void> => {
    // This is the output of our mock function
    const provider = await factory.getProvider() as any;
    expect(provider.proxy).toBe(true);
    const { issuer, config } = provider as { issuer: string; config: Configuration };
    expect(issuer).toBe(baseUrl);

    // Copies the base config
    expect(config.claims).toEqual(baseConfig.claims);

    (config.adapter as (name: string) => any)('test!');
    expect(adapterFactory.createStorageAdapter).toHaveBeenCalledTimes(1);
    expect(adapterFactory.createStorageAdapter).toHaveBeenLastCalledWith('test!');

    expect(config.cookies?.keys).toEqual([ expect.any(String) ]);
    expect(config.jwks).toEqual({ keys: [ expect.objectContaining({ kty: 'RSA' }) ]});
    expect(config.routes).toEqual(routes);

    expect((config.interactions?.url as any)()).toEqual('/idp/');
    expect((config.audiences as any)(null, null, {}, 'access_token')).toBe('solid');
    expect((config.audiences as any)(null, null, { clientId: 'clientId' }, 'client_credentials')).toBe('clientId');

    const findResult = await config.findAccount?.({ oidc: { client: { clientId: 'clientId' }}} as any, webId);
    expect(findResult?.accountId).toBe(webId);
    await expect((findResult?.claims as any)()).resolves.toEqual({ sub: webId, webid: webId });

    expect((config.extraAccessTokenClaims as any)({}, {})).toEqual({});
    expect((config.extraAccessTokenClaims as any)({}, { kind: 'AccessToken', accountId: webId, clientId: 'clientId' }))
      .toEqual({
        webid: webId,
        client_id: 'clientId',
      });

    // Test the renderError function
    const response = { } as HttpResponse;
    await expect((config.renderError as any)({ res: response }, null, 'error!')).resolves.toBeUndefined();
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe)
      .toHaveBeenLastCalledWith({ error: 'error!', preferences: { type: { 'text/plain': 1 }}});
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response, result: { statusCode: 500 }});
  });

  it('copies a field from the input config if values need to be added to it.', async(): Promise<void> => {
    baseConfig.cookies = {
      long: { signed: true },
    };
    factory = new IdentityProviderFactory(baseConfig, {
      adapterFactory,
      baseUrl,
      idpPath,
      storage,
      errorHandler,
      responseWriter,
    });
    const { config } = await factory.getProvider() as unknown as { issuer: string; config: Configuration };
    expect(config.cookies?.long?.signed).toBe(true);
  });

  it('caches the provider.', async(): Promise<void> => {
    const result1 = await factory.getProvider() as unknown as { issuer: string; config: Configuration };
    const result2 = await factory.getProvider() as unknown as { issuer: string; config: Configuration };
    expect(result1).toBe(result2);
  });

  it('uses cached keys in case they already exist.', async(): Promise<void> => {
    const result1 = await factory.getProvider() as unknown as { issuer: string; config: Configuration };
    // Create a new factory that is not cached yet
    const factory2 = new IdentityProviderFactory(baseConfig, {
      adapterFactory,
      baseUrl,
      idpPath,
      storage,
      errorHandler,
      responseWriter,
    });
    const result2 = await factory2.getProvider() as unknown as { issuer: string; config: Configuration };
    expect(result1.config.cookies).toEqual(result2.config.cookies);
    expect(result1.config.jwks).toEqual(result2.config.jwks);
    expect(storage.get).toHaveBeenCalledTimes(4);
    expect(storage.set).toHaveBeenCalledTimes(2);
    expect(storage.set).toHaveBeenCalledWith('jwks', result1.config.jwks);
    expect(storage.set).toHaveBeenCalledWith('cookie-secret', result1.config.cookies?.keys);
  });
});
