import {
  KeyGeneratingIdpConfigurationGenerator,
} from '../../../../src/identity/configuration/KeyGeneratingIdpConfigurationGenerator';
import type { StorageAdapterFactory } from '../../../../src/identity/storage/StorageAdapterFactory';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
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
      authorization: '/idp/auth',
      check_session: '/idp/session/check',
      code_verification: '/idp/device',
      device_authorization: '/idp/device/auth',
      end_session: '/idp/session/end',
      introspection: '/idp/token/introspection',
      jwks: '/idp/jwks',
      pushed_authorization_request: '/idp/request',
      registration: '/idp/reg',
      revocation: '/idp/token/revocation',
      token: '/idp/token',
      userinfo: '/idp/me',
    },
  };
}

describe('A KeyGeneratingIdpConfigurationGenerator', (): void => {
  let storageAdapterFactory: StorageAdapterFactory;
  const baseUrl = 'http://test.com/foo/';
  let storage: KeyValueStorage<ResourceIdentifier, any>;
  let generator: KeyGeneratingIdpConfigurationGenerator;

  beforeEach(async(): Promise<void> => {
    storageAdapterFactory = {
      createStorageAdapter: jest.fn().mockReturnValue('adapter!'),
    };

    const map = new Map();
    storage = {
      get: jest.fn((id: ResourceIdentifier): any => map.get(id.path)),
      set: jest.fn((id: ResourceIdentifier, value: any): any => map.set(id.path, value)),
    } as any;

    generator = new KeyGeneratingIdpConfigurationGenerator(storageAdapterFactory, baseUrl, storage);
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
    expect(storage.set).toHaveBeenCalledWith({ path: `${baseUrl}/idp/jwks` }, result.jwks);
    expect(storage.set).toHaveBeenCalledWith({ path: `${baseUrl}/idp/cookie-secret` }, result.cookies?.keys);
  });
});
