import { Provider } from 'oidc-provider';

/**
 * An Extension of node-oidc-provider with configurations specifically for
 * Solid OIDC
 */
export default class SolidOidcIdentityProvider extends Provider {
  public constructor() {
    // TODO (@jackson) [>1.0.0]: finish this.
    // Also decide which of these should be configurable
    super('ISSUER_URL', {
      clients: [
        // {
        //   client_id: 'oidcCLIENT',
        //   client_secret: '...',
        //   grant_types: ['refresh_token', 'authorization_code'],
        //   redirect_uris: ['http://sso-client.dev/providers/7/open_id', 'http://sso-client.dev/providers/8/open_id'],
        // }
      ],
      interactions: {
        policy: [],
        url(ctx): string {
          // eslint-disable-line no-unused-vars
          return `/interaction/${ctx.oidc.uid}`;
        },
      },
      cookies: {
        long: { signed: true, maxAge: 1 * 24 * 60 * 60 * 1000 },
        short: { signed: true },
        keys: [
          'some secret key',
          'and also the old rotated away some time ago',
          'and one more',
        ],
      },
      claims: {
        address: [ 'address' ],
        email: [ 'email', 'email_verified' ],
        phone: [ 'phone_number', 'phone_number_verified' ],
        profile: [
          'birthdate',
          'family_name',
          'gender',
          'given_name',
          'locale',
          'middle_name',
          'name',
          'nickname',
          'picture',
          'preferred_username',
          'profile',
          'updated_at',
          'website',
          'zoneinfo',
        ],
      },
      formats: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        AccessToken: 'jwt',
      },
      features: {
        devInteractions: { enabled: true },
        deviceFlow: { enabled: true },
        introspection: { enabled: true },
        revocation: { enabled: true },
        registration: { enabled: true },
        dPoP: { enabled: true },
      },
      jwks: {
        keys: [],
      },
      ttl: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        AccessToken: 1 * 60 * 60,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        AuthorizationCode: 10 * 60,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        IdToken: 1 * 60 * 60,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        DeviceCode: 10 * 60,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        RefreshToken: 1 * 24 * 60 * 60,
      },
      subjectTypes: [ 'public', 'pairwise' ],
    });
  }
}
