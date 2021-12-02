import type { Configuration, KoaContextWithOIDC } from 'oidc-provider';
import type { ErrorHandler } from '../../../../src/http/output/error/ErrorHandler';
import type { ResponseWriter } from '../../../../src/http/output/ResponseWriter';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { IdentityProviderFactory } from '../../../../src/identity/configuration/IdentityProviderFactory';
import type { Interaction, InteractionHandler } from '../../../../src/identity/interaction/InteractionHandler';
import type { AdapterFactory } from '../../../../src/identity/storage/AdapterFactory';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { FoundHttpError } from '../../../../src/util/errors/FoundHttpError';

/* eslint-disable @typescript-eslint/naming-convention */
jest.mock('oidc-provider', (): any => ({
  Provider: jest.fn().mockImplementation((issuer: string, config: Configuration): any => ({ issuer, config })),
}));

const routes = {
  authorization: '/foo/oidc/auth',
  check_session: '/foo/oidc/session/check',
  code_verification: '/foo/oidc/device',
  device_authorization: '/foo/oidc/device/auth',
  end_session: '/foo/oidc/session/end',
  introspection: '/foo/oidc/token/introspection',
  jwks: '/foo/oidc/jwks',
  pushed_authorization_request: '/foo/oidc/request',
  registration: '/foo/oidc/reg',
  revocation: '/foo/oidc/token/revocation',
  token: '/foo/oidc/token',
  userinfo: '/foo/oidc/me',
};

describe('An IdentityProviderFactory', (): void => {
  let baseConfig: Configuration;
  const baseUrl = 'http://example.com/foo/';
  const oidcPath = '/oidc';
  const webId = 'http://alice.example.com/card#me';
  const redirectUrl = 'http://example.com/login/';
  const oidcInteraction: Interaction = {} as any;
  let ctx: KoaContextWithOIDC;
  let interactionHandler: jest.Mocked<InteractionHandler>;
  let adapterFactory: jest.Mocked<AdapterFactory>;
  let storage: jest.Mocked<KeyValueStorage<string, any>>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let responseWriter: jest.Mocked<ResponseWriter>;
  let factory: IdentityProviderFactory;

  beforeEach(async(): Promise<void> => {
    baseConfig = { claims: { webid: [ 'webid', 'client_webid' ]}};

    ctx = {
      method: 'GET',
      request: {
        href: 'http://example.com/idp/',
      },
    } as any;

    interactionHandler = {
      handleSafe: jest.fn().mockRejectedValue(new FoundHttpError(redirectUrl)),
    } as any;

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
      oidcPath,
      interactionHandler,
      storage,
      errorHandler,
      responseWriter,
    });
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

    await expect((config.interactions?.url as any)(ctx, oidcInteraction)).resolves.toBe(redirectUrl);
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

  it('errors if there is no valid interaction redirect.', async(): Promise<void> => {
    interactionHandler.handleSafe.mockRejectedValueOnce(new Error('bad data'));
    const provider = await factory.getProvider() as any;
    const { config } = provider as { config: Configuration };
    await expect((config.interactions?.url as any)(ctx, oidcInteraction)).rejects.toThrow('bad data');

    interactionHandler.handleSafe.mockResolvedValueOnce(new BasicRepresentation());
    await expect((config.interactions?.url as any)(ctx, oidcInteraction))
      .rejects.toThrow('Could not correctly redirect for the given interaction.');
  });

  it('copies a field from the input config if values need to be added to it.', async(): Promise<void> => {
    baseConfig.cookies = {
      long: { signed: true },
    };
    factory = new IdentityProviderFactory(baseConfig, {
      adapterFactory,
      baseUrl,
      oidcPath,
      interactionHandler,
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
      oidcPath,
      interactionHandler,
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
