/* eslint-disable @typescript-eslint/naming-convention, tsdoc/syntax */
// import/no-unresolved can't handle jose imports
// tsdoc/syntax can't handle {json} parameter
import { randomBytes } from 'crypto';
import type { JWK } from 'jose';
import { exportJWK, generateKeyPair } from 'jose';
import type { Account,
  Adapter,
  Configuration,
  ErrorOut,
  KoaContextWithOIDC,
  ResourceServer,
  UnknownObject,
  errors } from 'oidc-provider';
import { Provider } from 'oidc-provider';
import type { Operation } from '../../http/Operation';
import type { ErrorHandler } from '../../http/output/error/ErrorHandler';
import type { ResponseWriter } from '../../http/output/ResponseWriter';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { KeyValueStorage } from '../../storage/keyvalue/KeyValueStorage';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { RedirectHttpError } from '../../util/errors/RedirectHttpError';
import { guardStream } from '../../util/GuardedStream';
import { joinUrl } from '../../util/PathUtil';
import type { ClientCredentials } from '../interaction/email-password/credentials/ClientCredentialsAdapterFactory';
import type { InteractionHandler } from '../interaction/InteractionHandler';
import type { AdapterFactory } from '../storage/AdapterFactory';
import { JwksKeyGenerator } from './JwksKeyGenerator';
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
   * Path for all requests targeting the OIDC library.
   */
  oidcPath: string;
  /**
   * The handler responsible for redirecting interaction requests to the correct URL.
   */
  interactionHandler: InteractionHandler;
  /**
   * Storage containing the generated client credentials with their associated WebID.
   */
  credentialStorage: KeyValueStorage<string, ClientCredentials>;
  /**
   * Storage used to store cookie and JWT keys so they can be re-used in case of multithreading.
   */
  storage: KeyValueStorage<string, unknown>;
  /**
   * Extra information will be added to the error output if this is true.
   */
  showStackTrace: boolean;
  /**
   * Used to convert errors thrown by the OIDC library.
   */
  errorHandler: ErrorHandler;
  /**
   * Used to write out errors thrown by the OIDC library.
   */
  responseWriter: ResponseWriter;
  /**
   * Used to generate and cache/store JWKS
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
 * Routes will be updated based on the `baseUrl` and `oidcPath`.
 */
export class IdentityProviderFactory implements ProviderFactory {
  private readonly config: Configuration;
  private readonly adapterFactory: AdapterFactory;
  private readonly baseUrl: string;
  private readonly oidcPath: string;
  private readonly interactionHandler: InteractionHandler;
  private readonly credentialStorage: KeyValueStorage<string, ClientCredentials>;
  private readonly storage: KeyValueStorage<string, unknown>;
  private readonly showStackTrace: boolean;
  private readonly errorHandler: ErrorHandler;
  private readonly responseWriter: ResponseWriter;
  private readonly jwksKeyGenerator: JwksKeyGenerator;

  private readonly jwtAlg = 'ES256';
  private provider?: Provider;

  /**
   * @param config - JSON config for the OIDC library @range {json}
   * @param args - Remaining parameters required for the factory.
   */
  public constructor(config: Configuration, args: IdentityProviderFactoryArgs) {
    this.config = config;

    this.adapterFactory = args.adapterFactory;
    this.baseUrl = args.baseUrl;
    this.oidcPath = args.oidcPath;
    this.interactionHandler = args.interactionHandler;
    this.credentialStorage = args.credentialStorage;
    this.storage = args.storage;
    this.showStackTrace = args.showStackTrace;
    this.errorHandler = args.errorHandler;
    this.responseWriter = args.responseWriter;
    this.jwksKeyGenerator = args.jwksKeyGenerator;
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
    config.jwks = await this.jwksKeyGenerator.getPrivateJwks(JWKS_KEY, this.jwtAlg);
    config.cookies = {
      ...config.cookies,
      keys: await this.generateCookieKeys(),
    };

    // Solid OIDC requires pkce https://solid.github.io/solid-oidc/#concepts
    config.pkce = {
      methods: [ 'S256' ],
      required: (): true => true,
    };

    // Default client settings that might not be defined.
    // Mostly relevant for WebID clients.
    config.clientDefaults = {
      id_token_signed_response_alg: this.jwtAlg,
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
   * Adds the necessary claims the to id and access tokens based on the Solid OIDC spec.
   */
  private configureClaims(config: Configuration): void {
    // Returns the id_token
    // See https://solid.github.io/authentication-panel/solid-oidc/#tokens-id
    // Some fields are still missing, see https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1154#issuecomment-1040233385
    config.findAccount = async(ctx: KoaContextWithOIDC, sub: string): Promise<Account> => ({
      accountId: sub,
      async claims(): Promise<{ sub: string; [key: string]: any }> {
        return { sub, webid: sub, azp: ctx.oidc.client?.clientId };
      },
    });

    // Add extra claims in case an AccessToken is being issued.
    // Specifically this sets the required webid and client_id claims for the access token
    // See https://solid.github.io/solid-oidc/#resource-access-validation
    config.extraTokenClaims = async(ctx, token): Promise<UnknownObject> =>
      this.isAccessToken(token) ?
        { webid: token.accountId } :
        { webid: token.client && (await this.credentialStorage.get(token.client.clientId))?.webId };

    config.features = {
      ...config.features,
      resourceIndicators: {
        defaultResource(): string {
          // This value is irrelevant, but is necessary to trigger the `getResourceServerInfo` call below,
          // where it will be an input parameter in case the client provided no value.
          // Note that an empty string is not a valid value.
          return 'http://example.com/';
        },
        enabled: true,
        // This call is necessary to force the OIDC library to return a JWT access token.
        // See https://github.com/panva/node-oidc-provider/discussions/959#discussioncomment-524757
        getResourceServerInfo: (): ResourceServer => ({
          // The scopes of the Resource Server.
          // These get checked when requesting client credentials.
          scope: 'webid',
          audience: 'solid',
          accessTokenFormat: 'jwt',
          jwt: {
            sign: { alg: this.jwtAlg },
          },
        }),
      },
    };
  }

  /**
   * Creates the route string as required by the `oidc-provider` library.
   * In case base URL is `http://test.com/foo/`, `oidcPath` is `/idp` and `relative` is `device/auth`,
   * this would result in `/foo/idp/device/auth`.
   */
  private createRoute(relative: string): string {
    return new URL(joinUrl(this.baseUrl, this.oidcPath, relative)).pathname;
  }

  /**
   * Sets up all the IDP routes relative to the IDP path.
   */
  private configureRoutes(config: Configuration): void {
    // When oidc-provider cannot fulfill the authorization request for any of the possible reasons
    // (missing user session, requested ACR not fulfilled, prompt requested, ...)
    // it will resolve the interactions.url helper function and redirect the User-Agent to that url.
    // Another requirement is that `features.userinfo` is disabled in the configuration.
    config.interactions = {
      url: async(ctx, oidcInteraction): Promise<string> => {
        const operation: Operation = {
          method: ctx.method,
          target: { path: ctx.request.href },
          preferences: {},
          body: new BasicRepresentation(),
        };

        // Instead of sending a 3xx redirect to the client (via a RedirectHttpError),
        // we need to pass the location URL to the OIDC library
        try {
          await this.interactionHandler.handleSafe({ operation, oidcInteraction });
        } catch (error: unknown) {
          if (RedirectHttpError.isInstance(error)) {
            return error.location;
          }
          throw error;
        }
        throw new InternalServerError('Could not correctly redirect for the given interaction.');
      },
    };

    config.routes = {
      authorization: this.createRoute('auth'),
      backchannel_authentication: this.createRoute('backchannel'),
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
    config.renderError = async(ctx: KoaContextWithOIDC, out: ErrorOut, error: errors.OIDCProviderError | Error):
    Promise<void> => {
      // This allows us to stream directly to the response object, see https://github.com/koajs/koa/issues/944
      ctx.respond = false;

      // Doesn't really matter which type it is since all relevant fields are optional
      const oidcError = error as errors.OIDCProviderError;

      // OIDC library hides extra details in these fields
      if (this.showStackTrace) {
        if (oidcError.error_description) {
          error.message += ` - ${oidcError.error_description}`;
        }
        if (oidcError.error_detail) {
          oidcError.message += ` - ${oidcError.error_detail}`;
        }

        // Also change the error message in the stack trace
        if (error.stack) {
          error.stack = error.stack.replace(/.*/u, `${error.name}: ${error.message}`);
        }
      }

      const result = await this.errorHandler.handleSafe({ error, request: guardStream(ctx.req) });
      await this.responseWriter.handleSafe({ response: ctx.res, result });
    };
  }
}
