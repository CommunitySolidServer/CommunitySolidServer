import type { KeyPair } from '@inrupt/solid-client-authn-core';
import {
  buildAuthenticatedFetch,
  createDpopHeader,
  generateDpopKeyPair,
} from '@inrupt/solid-client-authn-core';
import { fetch } from 'cross-fetch';
import { parse, splitCookiesString } from 'set-cookie-parser';
import type { App } from '../../src/init/App';
import { APPLICATION_X_WWW_FORM_URLENCODED } from '../../src/util/ContentTypes';
import { joinUrl } from '../../src/util/PathUtil';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, getTestFolder, instantiateFromConfig, removeFolder } from './Config';
import { IdentityTestState } from './IdentityTestState';

const port = getPort('Identity');
const baseUrl = `http://localhost:${port}/`;

const rootFilePath = getTestFolder('Identity');
const stores: [string, any][] = [
  [ 'in-memory storage', {
    config: 'server-memory.json',
    teardown: jest.fn(),
  }],
  [ 'on-disk storage', {
    config: 'server-file.json',
    teardown: async(): Promise<void> => removeFolder(rootFilePath),
  }],
];

// Prevent panva/node-openid-client from emitting DraftWarning
jest.spyOn(process, 'emitWarning').mockImplementation();

// No way around the cookies https://github.com/panva/node-oidc-provider/issues/552 .
// They will be simulated by storing the values and passing them along.
// This is why the redirects are handled manually.
// We also need to parse the HTML in several steps since there is no API.
describe.each(stores)('A Solid server with IDP using %s', (name, { config, teardown }): void => {
  let app: App;
  const redirectUrl = 'http://mockedredirect/';
  const container = new URL('secret/', baseUrl).href;
  const oidcIssuer = baseUrl;
  const indexUrl = joinUrl(baseUrl, '.account/');
  let webId: string;
  const email = 'test@test.com';
  const password = 'password!';

  beforeAll(async(): Promise<void> => {
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      getTestConfigPath(config),
      {
        ...getDefaultVariables(port, baseUrl),
        'urn:solid-server:default:variable:rootFilePath': rootFilePath,
      },
    ) as Record<string, any>;
    ({ app } = instances);
    await app.start();

    // Create an account with WebID
    let res = await fetch(indexUrl);
    let { controls } = await res.json();
    res = await fetch(controls.account.create, { method: 'POST' });

    const cookies = parse(splitCookiesString(res.headers.get('set-cookie')!));
    const cookie = `${cookies[0].name}=${cookies[0].value}`;
    res = await fetch(indexUrl, { headers: { cookie }});
    ({ controls } = await res.json());

    // Add password login
    res = await fetch(controls.password.create, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.status !== 200) {
      throw new Error('Setup error creating login');
    }

    // Create a pod
    res = await fetch(controls.account.pod, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });
    if (res.status !== 200) {
      throw new Error('Setup error creating pod');
    }
    const json = await res.json();
    ({ webId } = json);

    // Create container where only webId can write
    const aclTurtle = `
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
<#owner> a acl:Authorization;
         acl:agent <${webId}>;
         acl:accessTo <./>;
         acl:default <./>;
         acl:mode acl:Read, acl:Write, acl:Control.
`;
    res = await fetch(`${container}.acl`, {
      method: 'PUT',
      headers: { 'content-type': 'text/turtle' },
      body: aclTurtle,
    });
    if (res.status !== 201) {
      throw new Error(`Something went wrong initializing the test ACL: ${await res.text()}`);
    }
  });

  afterAll(async(): Promise<void> => {
    await teardown();
    await app.stop();
  });

  describe('authenticating', (): void => {
    let state: IdentityTestState;
    let nextUrl: string;

    beforeAll(async(): Promise<void> => {
      state = new IdentityTestState(baseUrl, redirectUrl, oidcIssuer);
    });

    afterAll(async(): Promise<void> => {
      await state.session.logout();
    });

    it('initializes the session.', async(): Promise<void> => {
      // This is the auth URL with all the relevant query parameters
      nextUrl = await state.initSession();
      expect(nextUrl.startsWith(oidcIssuer)).toBeTruthy();

      // Redirect to our login page
      nextUrl = await state.handleRedirect(nextUrl);

      // Compare received URL with login URL in our controls
      const res = await fetch(indexUrl);
      expect((await res.json()).controls.html.main.login).toBe(nextUrl);
    });

    it('logs in.', async(): Promise<void> => {
      // This redirects to the login page, which is irrelevant when using JSON
      // since the available options are already in the controls.
      // But we can still use the URL to get the controls.
      let res = await fetch(nextUrl);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.controls.password.login).toBeDefined();
      nextUrl = json.controls.password.login;

      // Log in using email/password
      res = await state.fetchIdp(nextUrl, 'POST', JSON.stringify({ email, password }), 'application/json');

      // Redirect to WebID picker
      nextUrl = await state.handleLocationRedirect(res);
    });

    it('sends a token for the chosen WebID.', async(): Promise<void> => {
      // See the available WebIDs
      let res = await state.fetchIdp(nextUrl);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.webIds).toEqual([ webId ]);

      // Pick the WebID
      // Errors if the WebID is not registered to the account
      res = await state.fetchIdp(nextUrl, 'POST', JSON.stringify(
        { webId: 'http://example.com/wrong', remember: true },
      ), 'application/json');
      expect(res.status).toBe(400);
      res = await state.fetchIdp(nextUrl, 'POST', JSON.stringify({ webId, remember: true }), 'application/json');

      // Redirect to the consent page
      nextUrl = await state.handleLocationRedirect(res);
    });

    it('consents and redirects back to the client.', async(): Promise<void> => {
      let res = await state.fetchIdp(nextUrl);
      const json = await res.json();
      expect(json.webId).toBe(webId);
      expect(json.client.grant_types).toContain('authorization_code');
      expect(json.client.grant_types).toContain('refresh_token');

      res = await state.fetchIdp(nextUrl, 'POST');

      // Redirect back to the client
      nextUrl = await state.handleLocationRedirect(res);
      expect(nextUrl.startsWith(redirectUrl)).toBe(true);

      // Handle the redirect
      const info = await state.session.handleIncomingRedirect(nextUrl);
      expect(info?.isLoggedIn).toBe(true);
    });

    it('can only access the profile container when using the logged in session.', async(): Promise<void> => {
      let res = await fetch(container);
      expect(res.status).toBe(401);

      res = await state.session.fetch(container);
      expect(res.status).toBe(200);
    });

    it('can no longer access the container after logging out.', async(): Promise<void> => {
      await state.session.logout();
      const res = await state.session.fetch(container);
      expect(res.status).toBe(401);
    });

    it('immediately gets redirect to the consent page in the next session.', async(): Promise<void> => {
      nextUrl = await state.initSession();
      expect(nextUrl.length > 0).toBeTruthy();
      expect(nextUrl.startsWith(oidcIssuer)).toBeTruthy();

      // Immediately redirect to the consent page due to the stored session
      nextUrl = await state.handleRedirect(nextUrl);

      const res = await state.fetchIdp(nextUrl);
      const json = await res.json();
      expect(json.webId).toBe(webId);
      expect(json.client.grant_types).toEqual([ 'authorization_code', 'refresh_token' ]);
    });

    it('can forget the stored WebID.', async(): Promise<void> => {
      let res = await state.fetchIdp(nextUrl, 'POST', JSON.stringify({ logOut: true }), 'application/json');

      // We have to pick a WebID again
      nextUrl = await state.handleLocationRedirect(res);
      res = await state.fetchIdp(nextUrl, 'POST', JSON.stringify({ webId, remember: true }), 'application/json');

      // Redirect back to the consent page
      nextUrl = await state.handleLocationRedirect(res);
    });

    it('can consent again.', async(): Promise<void> => {
      let res = await state.fetchIdp(nextUrl, 'POST');

      // Redirect back to the client
      nextUrl = await state.handleLocationRedirect(res);
      expect(nextUrl.startsWith(redirectUrl)).toBe(true);

      // Handle the callback
      const info = await state.session.handleIncomingRedirect(nextUrl);
      expect(info?.isLoggedIn).toBe(true);

      // Verify by accessing the private container
      res = await state.session.fetch(container);
      expect(res.status).toBe(200);
    });
  });

  describe('authenticating a client with a WebID', (): void => {
    const clientId = joinUrl(baseUrl, 'client-id');
    const badClientId = joinUrl(baseUrl, 'bad-client-id');
    /* eslint-disable @typescript-eslint/naming-convention */
    const clientJson = {
      '@context': 'https://www.w3.org/ns/solid/oidc-context.jsonld',

      client_id: clientId,
      client_name: 'Solid Application Name',
      redirect_uris: [ redirectUrl ],
      post_logout_redirect_uris: [ 'https://app.example/logout' ],
      client_uri: 'https://app.example/',
      logo_uri: 'https://app.example/logo.png',
      tos_uri: 'https://app.example/tos.html',
      scope: 'openid profile offline_access webid',
      grant_types: [ 'refresh_token', 'authorization_code' ],
      response_types: [ 'code' ],
      default_max_age: 3600,
      require_auth_time: true,
    };
    // This client will always reject requests since there is no valid redirect
    const badClientJson = {
      ...clientJson,
      client_id: badClientId,
      redirect_uris: [],
    };
    /* eslint-enable @typescript-eslint/naming-convention */
    let state: IdentityTestState;

    beforeAll(async(): Promise<void> => {
      state = new IdentityTestState(baseUrl, redirectUrl, oidcIssuer);

      await fetch(clientId, {
        method: 'PUT',
        headers: { 'content-type': 'application/ld+json' },
        body: JSON.stringify(clientJson),
      });

      await fetch(badClientId, {
        method: 'PUT',
        headers: { 'content-type': 'application/ld+json' },
        body: JSON.stringify(badClientJson),
      });
    });

    afterAll(async(): Promise<void> => {
      await state.session.logout();
    });

    it('initializes the session and logs in.', async(): Promise<void> => {
      let nextUrl = await state.initSession(clientId);

      // Redirect to our login page
      nextUrl = await state.handleRedirect(nextUrl);

      // Find password login URL
      let res = await fetch(nextUrl);
      expect(res.status).toBe(200);
      nextUrl = (await res.json()).controls.password.login;

      // Log in using email/password
      res = await state.fetchIdp(nextUrl, 'POST', JSON.stringify({ email, password }), 'application/json');

      // Redirect to WebID picker
      nextUrl = await state.handleLocationRedirect(res);

      // Pick the WebID
      res = await state.fetchIdp(nextUrl, 'POST', JSON.stringify({ webId, remember: true }), 'application/json');

      // Redirect to the consent page
      nextUrl = await state.handleLocationRedirect(res);

      // Verify the client information the server discovered
      res = await state.fetchIdp(nextUrl);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.webId).toBe(webId);
      expect(json.client.client_id).toBe(clientJson.client_id);
      expect(json.client.client_name).toBe(clientJson.client_name);
      expect(json.client.grant_types).toContain('authorization_code');
      expect(json.client.grant_types).toContain('refresh_token');

      res = await state.fetchIdp(nextUrl, 'POST');

      // Redirect back to the client
      nextUrl = await state.handleLocationRedirect(res);
      expect(nextUrl.startsWith(redirectUrl)).toBe(true);

      // Handle the redirect
      const info = await state.session.handleIncomingRedirect(nextUrl);
      expect(info?.isLoggedIn).toBe(true);
    });

    it('rejects requests in case the redirect URL is not accepted.', async(): Promise<void> => {
      // This test allows us to make sure the server actually uses the client WebID.
      // If it did not, it would not see the invalid redirect_url array.

      let nextUrl = '';
      await state.session.login({
        redirectUrl,
        oidcIssuer,
        clientId: badClientId,
        handleRedirect(data): void {
          nextUrl = data;
        },
      });
      expect(nextUrl.length > 0).toBeTruthy();
      expect(nextUrl.startsWith(oidcIssuer)).toBeTruthy();

      // Redirect will error due to invalid client WebID
      const res = await state.fetchIdp(nextUrl);
      expect(res.status).toBe(400);
      await expect(res.text()).resolves.toContain('invalid_redirect_uri');
    });
  });

  describe('using client_credentials', (): void => {
    const tokenUrl = joinUrl(baseUrl, '.oidc/token');
    let dpopKey: KeyPair;
    let id: string | undefined;
    let secret: string | undefined;
    let accessToken: string | undefined;

    beforeAll(async(): Promise<void> => {
      dpopKey = await generateDpopKeyPair();
    });

    it('can request a credentials token.', async(): Promise<void> => {
      // Login and save cookie
      const { controls } = await (await fetch(indexUrl)).json();
      const loginResponse = await fetch(controls.password.login, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const cookies = parse(splitCookiesString(loginResponse.headers.get('set-cookie')!));
      const cookie = `${cookies[0].name}=${cookies[0].value}`;

      // Request token
      const accountJson = await (await fetch(indexUrl, { headers: { cookie }})).json();
      const credentialsUrl = accountJson.controls.account.clientCredentials;
      const res = await fetch(credentialsUrl, {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'token', webId }),
      });

      expect(res.status).toBe(200);
      ({ id, secret } = await res.json());
    });

    it('can request an access token using the credentials.', async(): Promise<void> => {
      const dpopHeader = await createDpopHeader(tokenUrl, 'POST', dpopKey);
      const authString = `${encodeURIComponent(id!)}:${encodeURIComponent(secret!)}`;
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
          'content-type': APPLICATION_X_WWW_FORM_URLENCODED,
          dpop: dpopHeader,
        },
        body: 'grant_type=client_credentials&scope=webid',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      ({ access_token: accessToken } = json);
      expect(typeof accessToken).toBe('string');
    });

    it('can use the generated access token to do an authenticated call.', async(): Promise<void> => {
      const authFetch = await buildAuthenticatedFetch(fetch, accessToken!, { dpopKey });
      let res = await fetch(container);
      expect(res.status).toBe(401);
      res = await authFetch(container);
      expect(res.status).toBe(200);
    });
  });

  describe('setup', (): void => {
    it('should contain the required configuration keys.', async(): Promise<void> => {
      const res = await fetch(`${baseUrl}.well-known/openid-configuration`);
      const jsonBody = await res.json();

      expect(res.status).toBe(200);
      // https://solid.github.io/solid-oidc/#discovery
      expect(jsonBody.scopes_supported).toContain('webid');
    });

    it('should return correct error output.', async(): Promise<void> => {
      const res = await fetch(`${baseUrl}.oidc/foo`, { headers: { accept: 'application/json' }});
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.name).toBe(`InvalidRequest`);
      expect(json.message).toBe(`invalid_request - unrecognized route or not allowed method (GET on /.oidc/foo)`);
      expect(json.statusCode).toBe(404);
      expect(json.stack).toBeDefined();
      expect(json.error).toBe('invalid_request');
    });
  });
});
