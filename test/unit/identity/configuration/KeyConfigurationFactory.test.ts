import { KeyConfigurationFactory } from '../../../../src/identity/configuration/KeyConfigurationFactory';
import type { AdapterFactory } from '../../../../src/identity/storage/AdapterFactory';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';

/* eslint-disable @typescript-eslint/naming-convention */
function getExpected(adapter: any, cookieKeys: any, jwks: any): any {
  return {
    adapter,
    cookies: {
      long: { signed: true, maxAge: 1 * 24 * 60 * 60 * 1000 },
      short: { signed: true },
      keys: cookieKeys,
    },
    conformIdTokenClaims: false,
    features: {
      devInteractions: { enabled: false },
      deviceFlow: { enabled: true },
      introspection: { enabled: true },
      revocation: { enabled: true },
      registration: { enabled: true },
      claimsParameter: { enabled: true },
    },
    jwks,
    ttl: {
      AccessToken: 1 * 60 * 60,
      AuthorizationCode: 10 * 60,
      IdToken: 1 * 60 * 60,
      DeviceCode: 10 * 60,
      RefreshToken: 1 * 24 * 60 * 60,
    },
    subjectTypes: [ 'public', 'pairwise' ],
    routes: {
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
    },
    discovery: {
      solid_oidc_supported: 'https://solidproject.org/TR/solid-oidc',
    },
  };
}

describe('A KeyConfigurationFactory', (): void => {
  let storageAdapterFactory: AdapterFactory;
  const baseUrl = 'http://test.com/foo/';
  const idpPathName = 'idp';
  let storage: KeyValueStorage<string, any>;
  let generator: KeyConfigurationFactory;

  beforeEach(async(): Promise<void> => {
    storageAdapterFactory = {
      createStorageAdapter: jest.fn().mockReturnValue('adapter!'),
    };

    const map = new Map();
    storage = {
      get: jest.fn((id: string): any => map.get(id)),
      set: jest.fn((id: string, value: any): any => map.set(id, value)),
    } as any;

    generator = new KeyConfigurationFactory(storageAdapterFactory, baseUrl, idpPathName, storage);
  });

  it('creates a correct configuration.', async(): Promise<void> => {
    const result = await generator.createConfiguration();
    expect(result).toEqual(getExpected(
      expect.any(Function),
      [ expect.any(String) ],
      { keys: [ expect.objectContaining({ kty: 'RSA' }) ]},
    ));

    (result.adapter as (name: string) => any)('test!');
    expect(storageAdapterFactory.createStorageAdapter).toHaveBeenCalledTimes(1);
    expect(storageAdapterFactory.createStorageAdapter).toHaveBeenLastCalledWith('test!');
  });

  it('stores cookie keys and jwks for re-use.', async(): Promise<void> => {
    const result = await generator.createConfiguration();
    const result2 = await generator.createConfiguration();
    expect(result.cookies).toEqual(result2.cookies);
    expect(result.jwks).toEqual(result2.jwks);
    expect(storage.get).toHaveBeenCalledTimes(4);
    expect(storage.set).toHaveBeenCalledTimes(2);
    expect(storage.set).toHaveBeenCalledWith('idp/jwks', result.jwks);
    expect(storage.set).toHaveBeenCalledWith('idp/cookie-secret', result.cookies?.keys);
  });
});
