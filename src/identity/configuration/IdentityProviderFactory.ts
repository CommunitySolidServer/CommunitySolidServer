/* eslint-disable @typescript-eslint/naming-convention, tsdoc/syntax */
// tsdoc/syntax can't handle {json} parameter
import { randomBytes } from 'crypto';
import type { AnyObject,
  CanBePromise,
  KoaContextWithOIDC,
  Configuration,
  Account,
  ErrorOut,
  Adapter } from 'oidc-provider';
import { Provider } from 'oidc-provider';
import type { ErrorHandler } from '../../http/output/error/ErrorHandler';
import type { ResponseWriter } from '../../http/output/ResponseWriter';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { ensureTrailingSlash, joinUrl } from '../../util/PathUtil';
import type { AdapterFactory } from '../storage/AdapterFactory';
import type { JwksKeyGenerator } from './JwksKeyGenerator';
import type { ProviderFactory } from './ProviderFactory';

export interface IdentityProviderFactoryArgs {
  /**
   * Factory that creates the adapter used for OIDC data storage.
   */
  adapterFactory: AdapterFactory;
  /**
   * Base URL of the server.
   */
  baseUrl: string;
  /**
   * Path of the IDP component in the server.
   * Should start with a slash.
   */
  idpPath: string;
  /**
   * Storage used to store cookie and JWT keys so they can be re-used in case of multithreading.
   */
  storage: KeyValueStorage<string, unknown>;
  /**
   * Used to convert errors thrown by the OIDC library.
   */
  errorHandler: ErrorHandler;
  /**
   * Used to write out errors thrown by the OIDC library.
   */
  responseWriter: ResponseWriter;
  /**
   * Used to generate and store JWKS
   */
  jwksKeyGenerator: JwksKeyGenerator;
}

const JWKS_KEY = 'jwks';
const COOKIES_KEY = 'cookie-secret';

/**
 * Creates an OIDC Provider based on the provided configuration and parameters.
 * The provider will be cached and returned on subsequent calls.
 * Cookie and JWT keys will be stored in an internal storage so they can be re-used over multiple threads.
 * Necessary claims for Solid OIDC interactions will be added.
 * Routes will be updated based on the `baseUrl` and `idpPath`.
 */
export class IdentityProviderFactory implements ProviderFactory {
  private readonly config: Configuration;
  private readonly adapterFactory!: AdapterFactory;
  private readonly baseUrl!: string;
  private readonly idpPath!: string;
  private readonly storage!: KeyValueStorage<string, unknown>;
  private readonly errorHandler!: ErrorHandler;
  private readonly responseWriter!: ResponseWriter;
  private readonly jwksKeyGenerator!: JwksKeyGenerator;

  private provider?: Provider;

  /**
   * @param config - JSON config for the OIDC library @range {json}
   * @param args - Remaining parameters required for the factory.
   */
  public constructor(config: Configuration, args: IdentityProviderFactoryArgs) {
    if (!args.idpPath.startsWith('/')) {
      throw new Error('idpPath needs to start with a /');
    }
    this.config = config;
    Object.assign(this, args);
  }

  public async getProvider(): Promise<Provider> {
    if (this.provider) {
      return this.provider;
    }
    this.provider = await this.createProvider();
    return this.provider;
  }

  /**
   * Creates a Provider by building a Configuration using all the stored parameters.
   */
  private async createProvider(): Promise<Provider> {
    const config = await this.initConfig();

    // Add correct claims to IdToken/AccessToken responses
    this.configureClaims(config);

    // Make sure routes are contained in the IDP space
    this.configureRoutes(config);

    // Render errors with our own error handler
    this.configureErrors(config);

    // Allow provider to interpret reverse proxy headers
    const provider = new Provider(this.baseUrl, config);
    provider.proxy = true;
    return provider;
  }

  /**
   * Creates a configuration by copying the internal configuration
   * and adding the adapter, default audience and jwks/cookie keys.
   */
  private async initConfig(): Promise<Configuration> {
    // Create a deep copy
    const config: Configuration = JSON.parse(JSON.stringify(this.config));

    // Indicates which Adapter should be used for storing oidc data
    // The adapter function MUST be a named function.
    // See https://github.com/panva/node-oidc-provider/issues/799
    const factory = this.adapterFactory;
    config.adapter = function loadAdapter(name: string): Adapter {
      return factory.createStorageAdapter(name);
    };

    // Cast necessary due to typing conflict between jose 2.x and 3.x
    config.jwks = await this.jwksKeyGenerator.getPrivateJwks(JWKS_KEY) as any;
    config.cookies = {
      ...config.cookies ?? {},
      keys: await this.generateCookieKeys(),
    };

    return config;
  }

  /**
   * Generates a cookie secret to be used for cookie signing.
   * The key will be cached so subsequent calls return the same key.
   */
  private async generateCookieKeys(): Promise<string[]> {
    // Check to see if the keys are already saved
    const cookieSecret = await this.storage.get(COOKIES_KEY);
    if (Array.isArray(cookieSecret)) {
      return cookieSecret;
    }
    // If they are not, generate and save them
    const newCookieSecret = [ randomBytes(64).toString('hex') ];
    await this.storage.set(COOKIES_KEY, newCookieSecret);
    return newCookieSecret;
  }

  /**
   * Checks if the given token is an access token.
   * The AccessToken interface is not exported so we have to access it like this.
   */
  private isAccessToken(token: any): token is KoaContextWithOIDC['oidc']['accessToken'] {
    return token.kind === 'AccessToken';
  }

  /**
   * Adds the necessary claims the to id token and access token based on the Solid OIDC spec.
   */
  private configureClaims(config: Configuration): void {
    // Access token audience is 'solid', ID token audience is the client_id
    config.audiences = (ctx, sub, token, use): string =>
      use === 'access_token' ? 'solid' : token.clientId!;

    // Returns the id_token
    // See https://solid.github.io/authentication-panel/solid-oidc/#tokens-id
    config.findAccount = async(ctx: KoaContextWithOIDC, sub: string): Promise<Account> => ({
      accountId: sub,
      claims: async(): Promise<{ sub: string; [key: string]: any }> =>
        ({ sub, webid: sub }),
    });

    // Add extra claims in case an AccessToken is being issued.
    // Specifically this sets the required webid and client_id claims for the access token
    // See https://solid.github.io/authentication-panel/solid-oidc/#tokens-access
    config.extraAccessTokenClaims = (ctx, token): CanBePromise<AnyObject | void> =>
      this.isAccessToken(token) ?
        { webid: token.accountId, client_id: token.clientId } :
        {};
  }

  /**
   * Creates the route string as required by the `oidc-provider` library.
   * In case base URL is `http://test.com/foo/`, `idpPath` is `/idp` and `relative` is `device/auth`,
   * this would result in `/foo/idp/device/auth`.
   */
  private createRoute(relative: string): string {
    return new URL(joinUrl(this.baseUrl, this.idpPath, relative)).pathname;
  }

  /**
   * Sets up all the IDP routes relative to the IDP path.
   */
  private configureRoutes(config: Configuration): void {
    // When oidc-provider cannot fulfill the authorization request for any of the possible reasons
    // (missing user session, requested ACR not fulfilled, prompt requested, ...)
    // it will resolve the interactions.url helper function and redirect the User-Agent to that url.
    config.interactions = {
      url: (): string => ensureTrailingSlash(this.idpPath),
    };

    config.routes = {
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
    };
  }

  /**
   * Pipes library errors to the provided ErrorHandler and ResponseWriter.
   */
  private configureErrors(config: Configuration): void {
    config.renderError = async(ctx: KoaContextWithOIDC, out: ErrorOut, error: Error): Promise<void> => {
      // This allows us to stream directly to to the response object, see https://github.com/koajs/koa/issues/944
      ctx.respond = false;
      const result = await this.errorHandler.handleSafe({ error, preferences: { type: { 'text/plain': 1 }}});
      await this.responseWriter.handleSafe({ response: ctx.res, result });
    };
  }
}
