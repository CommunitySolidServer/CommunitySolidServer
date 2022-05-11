import { Readable } from 'stream';
import type { Configuration, KoaContextWithOIDC } from 'oidc-provider';
import type { ErrorHandler } from '../../../../src/http/output/error/ErrorHandler';
import type { ResponseWriter } from '../../../../src/http/output/ResponseWriter';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { IdentityProviderFactory } from '../../../../src/identity/configuration/IdentityProviderFactory';
import type {
  ClientCredentials,
} from '../../../../src/identity/interaction/email-password/credentials/ClientCredentialsAdapterFactory';
import type { Interaction, InteractionHandler } from '../../../../src/identity/interaction/InteractionHandler';
import type { AdapterFactory } from '../../../../src/identity/storage/AdapterFactory';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { FoundHttpError } from '../../../../src/util/errors/FoundHttpError';

/* eslint-disable @typescript-eslint/naming-convention */
jest.mock('oidc-provider', (): any => ({
  Provider: jest.fn().mockImplementation((issuer: string, config: Configuration): any => ({ issuer, config })),
}));

const routes = {
  authorization: '/foo/oidc/auth',
  backchannel_authentication: '/foo/oidc/backchannel',
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
  let credentialStorage: jest.Mocked<KeyValueStorage<string, ClientCredentials>>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let responseWriter: jest.Mocked<ResponseWriter>;
  let factory: IdentityProviderFactory;

  beforeEach(async(): Promise<void> => {
    baseConfig = { claims: { webid: [ 'webid', 'client_webid' ]}};

    ctx = {
      method: 'GET',
      req: Readable.from('data'),
      res: {},
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

    credentialStorage = {
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
      credentialStorage,
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
    expect(config.jwks).toEqual({ keys: [ expect.objectContaining({ alg: 'ES256' }) ]});
    expect(config.routes).toEqual(routes);
    expect(config.pkce?.methods).toEqual([ 'S256' ]);
    expect((config.pkce!.required as any)()).toBe(true);
    expect(config.clientDefaults?.id_token_signed_response_alg).toBe('ES256');

    await expect((config.interactions?.url as any)(ctx, oidcInteraction)).resolves.toBe(redirectUrl);

    let findResult = await config.findAccount?.({ oidc: { client: { clientId: 'clientId' }}} as any, webId);
    expect(findResult?.accountId).toBe(webId);
    await expect((findResult?.claims as any)()).resolves.toEqual({ sub: webId, webid: webId, azp: 'clientId' });
    findResult = await config.findAccount?.({ oidc: {}} as any, webId);
    await expect((findResult?.claims as any)()).resolves.toEqual({ sub: webId, webid: webId });

    await expect((config.extraTokenClaims as any)({}, {})).resolves.toEqual({});
    const client = { clientId: 'my_id' };
    await expect((config.extraTokenClaims as any)({}, { client })).resolves.toEqual({});
    await credentialStorage.set('my_id', { webId: 'http://example.com/foo', secret: 'my-secret' });
    await expect((config.extraTokenClaims as any)({}, { client }))
      .resolves.toEqual({ webid: 'http://example.com/foo' });
    await expect((config.extraTokenClaims as any)({}, { kind: 'AccessToken', accountId: webId, clientId: 'clientId' }))
      .resolves.toEqual({ webid: webId });

    expect(config.features?.resourceIndicators?.enabled).toBe(true);
    expect((config.features?.resourceIndicators?.defaultResource as any)()).toBe('http://example.com/');
    expect((config.features?.resourceIndicators?.getResourceServerInfo as any)()).toEqual({
      scope: 'webid',
      audience: 'solid',
      accessTokenFormat: 'jwt',
      jwt: { sign: { alg: 'ES256' }},
    });

    // Test the renderError function
    await expect((config.renderError as any)(ctx, {}, 'error!')).resolves.toBeUndefined();
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe)
      .toHaveBeenLastCalledWith({ error: 'error!', request: ctx.req });
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response: ctx.res, result: { statusCode: 500 }});
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
      credentialStorage,
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
      credentialStorage,
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

  it('updates errors if there is more information.', async(): Promise<void> => {
    const provider = await factory.getProvider() as any;
    const { config } = provider as { config: Configuration };

    const error = new Error('bad data');
    const out = { error_description: 'more info' };

    await expect((config.renderError as any)(ctx, out, error)).resolves.toBeUndefined();
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe)
      .toHaveBeenLastCalledWith({ error, request: ctx.req });
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response: ctx.res, result: { statusCode: 500 }});
    expect(error.message).toBe('bad data - more info');
    expect(error.stack).toContain('Error: bad data - more info');
  });
});
