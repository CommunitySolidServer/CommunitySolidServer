/* eslint-disable @typescript-eslint/naming-convention, import/no-unresolved */
// import/no-unresolved can't handle jose imports
import { randomBytes } from 'crypto';
import type { JWK } from 'jose/jwk/from_key_like';
import { fromKeyLike } from 'jose/jwk/from_key_like';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import type { Adapter, Configuration } from 'oidc-provider';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { ensureTrailingSlash, trimTrailingSlashes } from '../../util/PathUtil';
import type { AdapterFactory } from '../storage/AdapterFactory';
import type { ConfigurationFactory } from './ConfigurationFactory';

/**
 * An IdP Configuration Factory that generates and saves keys
 * to the provided key value store.
 */
export class KeyConfigurationFactory implements ConfigurationFactory {
  private readonly adapterFactory: AdapterFactory;
  private readonly baseUrl: string;
  private readonly idpPathName: string;
  private readonly storage: KeyValueStorage<ResourceIdentifier, unknown>;

  public constructor(
    adapterFactory: AdapterFactory,
    baseUrl: string,
    idpPathName: string,
    storage: KeyValueStorage<ResourceIdentifier, unknown>,
  ) {
    this.adapterFactory = adapterFactory;
    this.baseUrl = ensureTrailingSlash(baseUrl);
    this.idpPathName = trimTrailingSlashes(idpPathName);
    this.storage = storage;
  }

  private getJwksKey(): ResourceIdentifier {
    return { path: new URL(`${this.idpPathName}/jwks`, this.baseUrl).href };
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
    return { path: new URL(`${this.idpPathName}/cookie-secret`, this.baseUrl).href };
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

  /**
   * Creates the route string as required by the `oidc-provider` library.
   * In case base URL is `http://test.com/foo/`, `idpPathName` is `idp` and `relative` is `device/auth`,
   * this would result in `/foo/idp/device/auth`.
   */
  private createRoute(relative: string): string {
    const url = new URL(`${this.idpPathName}/${relative}`, this.baseUrl);
    return url.pathname;
  }

  public async createConfiguration(): Promise<Configuration> {
    // Cast necessary due to typing conflict between jose 2.x and 3.x
    const jwks = await this.generateJwks() as any;
    const cookieKeys = await this.generateCookieKeys();

    // Aliasing the "this" variable is an anti-pattern that is better served by using
    // arrow functions. Unfortunately, the adapter function MUST be a named function
    // See https://github.com/panva/node-oidc-provider/issues/799
    const factory = this.adapterFactory;
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
        authorization: this.createRoute('auth'),
        check_session: this.createRoute('session/check'),
        code_verification: this.createRoute('device'),
        device_authorization: this.createRoute('device/auth'),
        end_session: this.createRoute('session/end'),
        introspection: this.createRoute('token/introspection'),
        jwks: this.createRoute('jwks'),
        pushed_authorization_request: this.createRoute('request'),
        registration: this.createRoute('reg'),
        revocation: this.createRoute('token/revocation'),
        token: this.createRoute('token'),
        userinfo: this.createRoute('me'),
      },
    };
  }
}
