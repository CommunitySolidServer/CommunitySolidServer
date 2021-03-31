/* eslint-disable @typescript-eslint/naming-convention, import/no-unresolved */
// import/no-unresolved can't handle jose imports
import { randomBytes } from 'crypto';
import type { JWK } from 'jose/jwk/from_key_like';
import { fromKeyLike } from 'jose/jwk/from_key_like';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import type { Adapter, Configuration } from 'oidc-provider';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import type { StorageAdapterFactory } from '../storage/StorageAdapterFactory';
import type { IdpConfigurationGenerator } from './IdpConfigurationGenerator';

/**
 * An IdP Configuration Factory that generates and saves keys
 * to the provided key value store.
 */
export class KeyGeneratingIdpConfigurationGenerator implements IdpConfigurationGenerator {
  private readonly storageAdapterFactory: StorageAdapterFactory;
  private readonly baseUrl: string;
  private readonly storage: KeyValueStorage<ResourceIdentifier, unknown>;
  private readonly logger = getLoggerFor(this);

  public constructor(
    storageAdapterFactory: StorageAdapterFactory,
    baseUrl: string,
    storage: KeyValueStorage<ResourceIdentifier, unknown>,
  ) {
    this.storageAdapterFactory = storageAdapterFactory;
    this.baseUrl = baseUrl;
    this.storage = storage;
  }

  private getJwksKey(): ResourceIdentifier {
    return { path: `${this.baseUrl}/idp/jwks` };
  }

  private async generateJwks(): Promise<{ keys: JWK[] }> {
    // Check to see if the keys are already saved
    const jwks = await this.storage.get(this.getJwksKey()) as { keys: JWK[] } | undefined;
    if (jwks) {
      return jwks;
    }
    // If they are not, generate and save them
    const { privateKey } = await generateKeyPair('RS256');
    const jwk = await fromKeyLike(privateKey);
    // In node v15.12.0 the JWKS does not get accepted because the JWK is not a plain object,
    // which is why we convert it into a plain object here.
    // Potentially this can be changed at a later point in time to `{ keys: [ jwk ]}`.
    const newJwks = { keys: [{ ...jwk }]};
    await this.storage.set(this.getJwksKey(), newJwks);
    return newJwks;
  }

  private getCookieSecretKey(): ResourceIdentifier {
    return { path: `${this.baseUrl}/idp/cookie-secret` };
  }

  private async generateCookieKeys(): Promise<string[]> {
    // Check to see if the keys are already saved
    const cookieSecret = await this.storage.get(this.getCookieSecretKey());
    if (Array.isArray(cookieSecret)) {
      return cookieSecret;
    }
    // If they are not, generate and save them
    const newCookieSecret = [ randomBytes(64).toString('hex') ];
    await this.storage.set(this.getCookieSecretKey(), newCookieSecret);
    return newCookieSecret;
  }

  public async createConfiguration(): Promise<Configuration> {
    // Cast necessary due to typing conflict between jose 2.x and 3.x
    const jwks = await this.generateJwks() as any;
    const cookieKeys = await this.generateCookieKeys();

    // Aliasing the "this" variable is an anti-pattern that is better served by using
    // arrow functions. Unfortunately, the adapter function MUST be a named function
    // See https://github.com/panva/node-oidc-provider/issues/799
    const factory = this.storageAdapterFactory;
    return {
      adapter: function loadAdapter(name: string): Adapter {
        return factory.createStorageAdapter(name);
      },
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
}
