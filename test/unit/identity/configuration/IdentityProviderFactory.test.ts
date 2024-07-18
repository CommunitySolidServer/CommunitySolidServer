import { Readable } from 'node:stream';
import { exportJWK, generateKeyPair } from 'jose';
import type { ErrorHandler } from '../../../../src/http/output/error/ErrorHandler';
import type { ResponseWriter } from '../../../../src/http/output/ResponseWriter';
import { IdentityProviderFactory } from '../../../../src/identity/configuration/IdentityProviderFactory';
import type { JwkGenerator } from '../../../../src/identity/configuration/JwkGenerator';
import type { PromptFactory } from '../../../../src/identity/configuration/PromptFactory';
import type {
  ClientCredentialsStore,
} from '../../../../src/identity/interaction/client-credentials/util/ClientCredentialsStore';
import type { Interaction } from '../../../../src/identity/interaction/InteractionHandler';
import type { InteractionRoute } from '../../../../src/identity/interaction/routing/InteractionRoute';
import type { AdapterFactory } from '../../../../src/identity/storage/AdapterFactory';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { extractErrorTerms } from '../../../../src/util/errors/HttpErrorUtil';
import { OAuthHttpError } from '../../../../src/util/errors/OAuthHttpError';
import type { Configuration, errors, KoaContextWithOIDC } from '../../../../templates/types/oidc-provider';

jest.mock('oidc-provider', (): any => {
  const fn = jest.fn((issuer: string, config: Configuration): any => ({ issuer, config, use: jest.fn() }));
  // The base export is the Provider class, but we also need some of the deeper exports like interactionPolicy
  (fn as any).interactionPolicy = jest.requireActual('oidc-provider').interactionPolicy;
  return fn;
});

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
  let jestWorkerId: string | undefined;
  let nodeEnv: string | undefined;
  let baseConfig: Configuration;
  const baseUrl = 'http://example.com/foo/';
  const oidcPath = '/oidc';
  const webId = 'http://alice.example.com/card#me';
  let oidcInteraction: Interaction;
  let interactionRoute: InteractionRoute;
  let ctx: KoaContextWithOIDC;
  let promptFactory: jest.Mocked<PromptFactory>;
  let adapterFactory: jest.Mocked<AdapterFactory>;
  let storage: jest.Mocked<KeyValueStorage<string, any>>;
  let jwkGenerator: jest.Mocked<JwkGenerator>;
  let clientCredentialsStore: jest.Mocked<ClientCredentialsStore>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let responseWriter: jest.Mocked<ResponseWriter>;
  let factory: IdentityProviderFactory;

  beforeAll(async(): Promise<void> => {
    // We need to fool the IDP factory into thinking we are not in a test run,
    // otherwise we can't mock the oidc-provider library,
    // as the `importOidcProvider` utility function always calls `jest.requireActual`.
    jestWorkerId = process.env.JEST_WORKER_ID;
    nodeEnv = process.env.NODE_ENV;
    delete process.env.JEST_WORKER_ID;
    delete process.env.NODE_ENV;
  });

  beforeEach(async(): Promise<void> => {
    // Disabling devInteractions to prevent warnings when testing the path
    // where we use the actual library instead of a mock.
    baseConfig = { claims: { webid: [ 'webid', 'client_webid' ]}, features: { devInteractions: { enabled: false }}};

    oidcInteraction = { prompt: { name: 'account' }} as any;

    interactionRoute = {
      getPath: jest.fn().mockReturnValue('http://example.com/interaction/'),
    } as any;

    ctx = {
      method: 'GET',
      req: Readable.from('data'),
      res: {},
      request: {
        href: 'http://example.com/idp/',
        query: {
          client_id: 'CLIENT_ID',
          redirect_uri: 'REDIRECT_URI',
        },
      },
      accepts: jest.fn().mockReturnValue('type'),
    } as any;

    promptFactory = {
      handleSafe: jest.fn(),
    } satisfies Partial<PromptFactory> as any;

    adapterFactory = {
      createStorageAdapter: jest.fn().mockReturnValue('adapter!'),
    };

    const map = new Map();
    storage = {
      get: jest.fn((id: string): any => map.get(id)),
      set: jest.fn((id: string, value: any): any => map.set(id, value)),
    } satisfies Partial<KeyValueStorage<string, any>> as any;

    const { privateKey, publicKey } = await generateKeyPair('ES256');
    jwkGenerator = {
      alg: 'ES256',
      getPrivateKey: jest.fn().mockResolvedValue({ ...await exportJWK(privateKey), alg: 'ES256' }),
      getPublicKey: jest.fn().mockResolvedValue({ ...await exportJWK(publicKey), alg: 'ES256' }),
    };

    clientCredentialsStore = {
      findByLabel: jest.fn(),
    } satisfies Partial<ClientCredentialsStore> as any;

    errorHandler = {
      handleSafe: jest.fn().mockResolvedValue({ statusCode: 500 }),
    } satisfies Partial<ErrorHandler> as any;

    responseWriter = { handleSafe: jest.fn() } satisfies Partial<ResponseWriter> as any;

    factory = new IdentityProviderFactory(baseConfig, {
      promptFactory,
      adapterFactory,
      baseUrl,
      oidcPath,
      interactionRoute,
      storage,
      jwkGenerator,
      clientCredentialsStore,
      showStackTrace: true,
      errorHandler,
      responseWriter,
    });
  });

  afterAll(async(): Promise<void> => {
    process.env.JEST_WORKER_ID = jestWorkerId;
    process.env.NODE_ENV = nodeEnv;
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

    await expect((config.interactions?.url as any)(ctx, oidcInteraction)).resolves.toBe(interactionRoute.getPath());

    let findResult = await config.findAccount?.({ oidc: { client: { clientId: 'clientId' }}} as any, webId);
    expect(findResult?.accountId).toBe(webId);
    await expect((findResult?.claims as any)()).resolves.toEqual({ sub: webId, webid: webId, azp: 'clientId' });
    findResult = await config.findAccount?.({ oidc: {}} as any, webId);
    await expect((findResult?.claims as any)()).resolves.toEqual({ sub: webId, webid: webId });

    await expect((config.extraTokenClaims as any)({}, {}))
      .rejects.toThrow('Missing client ID from client credentials.');
    const client = { clientId: 'my_id', kind: 'ClientCredentials' };
    await expect((config.extraTokenClaims as any)({}, { client }))
      .rejects.toThrow(`Unknown client credentials token my_id`);
    clientCredentialsStore.findByLabel.mockResolvedValueOnce({ id: 'id', label: 'label', accountId: 'id', webId: 'http://example.com/foo', secret: 'my-secret' });
    await expect((config.extraTokenClaims as any)({}, { client }))
      .resolves.toEqual({ webid: 'http://example.com/foo' });
    await expect((config.extraTokenClaims as any)({}, { kind: 'AccessToken', accountId: webId, clientId: 'clientId' }))
      .resolves.toEqual({ webid: webId });

    expect(config.features?.resourceIndicators?.enabled).toBe(true);
    expect((config.features?.resourceIndicators?.defaultResource as any)()).toBe('http://example.com/');
    expect((config.features?.resourceIndicators?.getResourceServerInfo as any)()).toEqual({
      scope: '',
      audience: 'solid',
      accessTokenFormat: 'jwt',
      jwt: { sign: { alg: 'ES256' }},
    });

    // Test the renderError function
    const error = new Error('error!');
    await expect((config.renderError as any)(ctx, {}, error)).resolves.toBeUndefined();
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe)
      .toHaveBeenLastCalledWith({ error, request: ctx.req });
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response: ctx.res, result: { statusCode: 500 }});

    // Test that the Prompt was added
    expect(promptFactory.handleSafe).toHaveBeenCalledTimes(1);
  });

  it('copies a field from the input config if values need to be added to it.', async(): Promise<void> => {
    baseConfig.cookies = {
      long: { signed: true },
    };
    factory = new IdentityProviderFactory(baseConfig, {
      promptFactory,
      adapterFactory,
      baseUrl,
      oidcPath,
      interactionRoute,
      storage,
      jwkGenerator,
      clientCredentialsStore,
      showStackTrace: true,
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
      promptFactory,
      adapterFactory,
      baseUrl,
      oidcPath,
      interactionRoute,
      storage,
      jwkGenerator,
      clientCredentialsStore,
      showStackTrace: true,
      errorHandler,
      responseWriter,
    });
    const result2 = await factory2.getProvider() as unknown as { issuer: string; config: Configuration };
    expect(result1.config.cookies).toEqual(result2.config.cookies);
    expect(storage.get).toHaveBeenCalledTimes(2);
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenCalledWith('cookie-secret', result1.config.cookies?.keys);
  });

  it('updates errors if there is more information.', async(): Promise<void> => {
    const provider = await factory.getProvider() as any;
    const { config } = provider as { config: Configuration };

    const error = new Error('bad data') as errors.OIDCProviderError;
    error.error_description = 'more info';
    error.error_detail = 'more details';

    const oAuthError = new OAuthHttpError(error, error.name, 500, 'bad data - more info - more details');

    await expect((config.renderError as any)(ctx, {}, error)).resolves.toBeUndefined();
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe)
      .toHaveBeenLastCalledWith({ error: oAuthError, request: ctx.req });
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response: ctx.res, result: { statusCode: 500 }});
    expect(oAuthError.message).toBe('bad data - more info - more details');
    expect(oAuthError.stack).toContain('Error: bad data - more info - more details');
  });

  it('throws a specific error for unknown clients.', async(): Promise<void> => {
    const provider = await factory.getProvider() as any;
    const { config } = provider as { config: Configuration };

    const error = new Error('invalid_client') as errors.OIDCProviderError;
    error.error_description = 'client is invalid';
    error.error_detail = 'client not found';

    await expect((config.renderError as any)(ctx, {}, error)).resolves.toBeUndefined();
    expect(errorHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(errorHandler.handleSafe)
      .toHaveBeenLastCalledWith({
        error: expect.objectContaining({
          statusCode: 400,
          name: 'BadRequestHttpError',
          message: 'Unknown client, you might need to clear the local storage on the client.',
          errorCode: 'E0003',
        }),
        request: ctx.req,
      });
    expect(extractErrorTerms(errorHandler.handleSafe.mock.calls[0][0].error.metadata)).toEqual({
      client_id: 'CLIENT_ID',
      redirect_uri: 'REDIRECT_URI',
    });
    expect(responseWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(responseWriter.handleSafe).toHaveBeenLastCalledWith({ response: ctx.res, result: { statusCode: 500 }});
  });

  it('adds middleware to make the OIDC provider think the request wants HTML.', async(): Promise<void> => {
    const provider = await factory.getProvider();
    expect(provider.use).toHaveBeenCalledTimes(1);
    const middleware = jest.mocked(provider.use).mock.calls[0][0];

    // eslint-disable-next-line jest/unbound-method
    const oldAccept = ctx.accepts;
    const next = jest.fn();
    await expect(middleware(ctx, next)).resolves.toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);

    expect(ctx.accepts('json', 'html')).toBe('html');
    expect(oldAccept).toHaveBeenCalledTimes(0);
  });

  it('does not modify the context accepts function in other cases.', async(): Promise<void> => {
    const provider = await factory.getProvider();
    expect(provider.use).toHaveBeenCalledTimes(1);
    const middleware = jest.mocked(provider.use).mock.calls[0][0];

    // eslint-disable-next-line jest/unbound-method
    const oldAccept = ctx.accepts;
    const next = jest.fn();
    await expect(middleware(ctx, next)).resolves.toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);

    expect(ctx.accepts('something')).toBe('type');
    expect(oldAccept).toHaveBeenCalledTimes(1);
    expect(oldAccept).toHaveBeenLastCalledWith('something');
  });

  it('avoids dynamic imports when testing with Jest.', async(): Promise<void> => {
    // Reset the env variable, so we can test the path where the dynamic import is not used
    process.env.JEST_WORKER_ID = jestWorkerId;
    const provider = await factory.getProvider() as any;
    // We don't define this in our mock
    expect(provider.app).toBeDefined();
  });
});
