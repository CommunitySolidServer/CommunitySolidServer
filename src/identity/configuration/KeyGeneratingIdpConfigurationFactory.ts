/* eslint-disable id-length */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/naming-convention */
import { randomBytes } from 'crypto';
import { JWK } from 'node-jose';
import type { Adapter, Configuration } from 'oidc-provider';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import type { KeyValueStore } from '../storage/KeyValueStore';
import type { StorageAdapterFactory } from '../storage/StorageAdapterFactory';
import { IdPConfigurationFactory } from './IdPConfigurationFactory';

export class KeyGeneratingIdpConfigurationFactory extends IdPConfigurationFactory {
  private readonly storageAdapterFactory: StorageAdapterFactory;
  private readonly baseUrl: string;
  private readonly store: KeyValueStore;
  private readonly logger = getLoggerFor(this);

  public constructor(
    storageAdapterFactory: StorageAdapterFactory,
    baseUrl: string,
    store: KeyValueStore,
  ) {
    super();
    this.storageAdapterFactory = storageAdapterFactory;
    this.baseUrl = baseUrl;
    this.store = store;
  }

  private getJwksKey(): ResourceIdentifier {
    return { path: `${this.baseUrl}/idp/jwks` };
  }

  // There is a typing difficulty with JSONWebKeySet, thus the "any"
  private async generateJwks(): Promise<any> {
    // Check to see if the keys are already saved
    const jwks = await this.store.get(this.getJwksKey());
    if (jwks) {
      return jwks;
    }
    // If they are not, generate and save them
    const keystore = JWK.createKeyStore();
    await keystore.generate('RSA');
    const newJwks = keystore.toJSON(true);
    await this.store.set(this.getJwksKey(), newJwks);
    return newJwks;
  }

  private getCookieSecretKey(): ResourceIdentifier {
    return { path: `${this.baseUrl}/idp/cookie-secret` };
  }

  private async generateCookieKeys(): Promise<string[]> {
    // Check to see if the keys are already saved
    const cookieSecret = await this.store.get(this.getCookieSecretKey());
    if (Array.isArray(cookieSecret)) {
      return cookieSecret;
    }
    // If they are not, generate and save them
    const newCookieSecret = [ randomBytes(64).toString('hex') ];
    await this.store.set(this.getCookieSecretKey(), newCookieSecret);
    return newCookieSecret;
  }

  public async createConfiguration(): Promise<Configuration> {
    const jwks = await this.generateJwks();
    const cookieKeys = await this.generateCookieKeys();

    // Aliasing the "this" variable is an anti-pattern that is better served by using
    // arrow functions. Unfortunately, the adapter function MUST be a named function
    // See https://github.com/panva/node-oidc-provider/issues/799
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    return {
      adapter: function loadAdapter(name: string): Adapter {
        return that.storageAdapterFactory.createStorageAdapter(name);
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
    };
  }
}
