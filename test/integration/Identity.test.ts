import { stringify } from 'querystring';
import { URL } from 'url';
import type { KeyPair } from '@inrupt/solid-client-authn-core';
import {
  buildAuthenticatedFetch,
  createDpopHeader,
  generateDpopKeyPair,
} from '@inrupt/solid-client-authn-core';
import { load } from 'cheerio';
import type { Response } from 'cross-fetch';
import { fetch } from 'cross-fetch';
import type { App } from '../../src/init/App';
import { APPLICATION_JSON, APPLICATION_X_WWW_FORM_URLENCODED } from '../../src/util/ContentTypes';
import { joinUrl } from '../../src/util/PathUtil';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, instantiateFromConfig } from './Config';
import { IdentityTestState } from './IdentityTestState';

const port = getPort('Identity');
const baseUrl = `http://localhost:${port}/`;

// Undo the global access token verifier mock
jest.unmock('@solid/access-token-verifier');

// Don't send actual e-mails
jest.mock('nodemailer');

// Prevent panva/node-openid-client from emitting DraftWarning
jest.spyOn(process, 'emitWarning').mockImplementation();

async function postForm(url: string, formBody: string): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': APPLICATION_X_WWW_FORM_URLENCODED },
    body: formBody,
  });
}

// No way around the cookies https://github.com/panva/node-oidc-provider/issues/552 .
// They will be simulated by storing the values and passing them along.
// This is why the redirects are handled manually.
// We also need to parse the HTML in several steps since there is no API.
describe('A Solid server with IDP', (): void => {
  let app: App;
  const redirectUrl = 'http://mockedredirect/';
  const container = new URL('secret/', baseUrl).href;
  const oidcIssuer = baseUrl;
  const card = joinUrl(baseUrl, 'profile/card');
  const webId = `${card}#me`;
  const webId2 = `${card}#someoneElse`;
  const email = 'test@test.com';
  const password = 'password!';
  const password2 = 'password2!';
  let sendMail: jest.Mock;

  beforeAll(async(): Promise<void> => {
    // Needs to happen before Components.js instantiation
    sendMail = jest.fn();
    const nodemailer = jest.requireMock('nodemailer');
    Object.assign(nodemailer, { createTransport: (): any => ({ sendMail }) });

    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      getTestConfigPath('server-memory.json'),
      getDefaultVariables(port, baseUrl),
    ) as Record<string, any>;
    ({ app } = instances);
    await app.start();

    // Create a simple webId
    const webIdTurtle = `<${webId}> <http://www.w3.org/ns/solid/terms#oidcIssuer> <${baseUrl}> .`;
    await fetch(card, {
      method: 'PUT',
      headers: { 'content-type': 'text/turtle' },
      body: webIdTurtle,
    });

    // Create container where only webId can write
    const aclTurtle = `
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
<#owner> a acl:Authorization;
         acl:agent <${webId}>;
         acl:accessTo <./>;
         acl:default <./>;
         acl:mode acl:Read, acl:Write, acl:Control.
`;
    const res = await fetch(`${container}.acl`, {
      method: 'PUT',
      headers: { 'content-type': 'text/turtle' },
      body: aclTurtle,
    });
    if (res.status !== 201) {
      throw new Error('Something went wrong initializing the test ACL');
    }
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  describe('doing registration', (): void => {
    let formBody: string;
    let registrationTriple: string;

    beforeAll(async(): Promise<void> => {
      // We will need this twice
      formBody = stringify({ email, webId, password, confirmPassword: password, register: 'ok' });
    });

    it('sends the form once to receive the registration triple.', async(): Promise<void> => {
      const res = await postForm(`${baseUrl}idp/register/`, formBody);
      expect(res.status).toBe(400);
      const json = await res.json();
      registrationTriple = json.details.quad;
    });

    it('updates the webId with the registration token.', async(): Promise<void> => {
      const patchBody = `INSERT DATA { ${registrationTriple} }`;
      const res = await fetch(webId, {
        method: 'PATCH',
        headers: { 'content-type': 'application/sparql-update' },
        body: patchBody,
      });
      expect(res.status).toBe(205);
    });

    it('sends the form again to successfully register.', async(): Promise<void> => {
      const res = await postForm(`${baseUrl}idp/register/`, formBody);
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(expect.objectContaining({
        webId,
        email,
        oidcIssuer: baseUrl,
      }));
    });
  });

  describe('authenticating', (): void => {
    let state: IdentityTestState;

    beforeAll(async(): Promise<void> => {
      state = new IdentityTestState(baseUrl, redirectUrl, oidcIssuer);
    });

    afterAll(async(): Promise<void> => {
      await state.session.logout();
    });

    it('initializes the session and logs in.', async(): Promise<void> => {
      let url = await state.startSession();
      const res = await state.fetchIdp(url);
      expect(res.status).toBe(200);
      url = await state.login(url, email, password);
      await state.consent(url);
      expect(state.session.info?.webId).toBe(webId);
    });

    it('can only access the container when using the logged in session.', async(): Promise<void> => {
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

    it('can log in again.', async(): Promise<void> => {
      const switchAccountUrl = await state.startSession();

      const switchAccountRes = await state.fetchIdp(switchAccountUrl);
      expect(switchAccountRes.status).toBe(200);

      // Will receive switch account screen here instead of login or confirm screen
      const consentUrl = await state.switchAccount(switchAccountUrl, true);

      const consentRes = await state.fetchIdp(consentUrl);
      expect(consentRes.status).toBe(200);

      await state.consent(consentUrl);

      expect(state.session.info?.webId).toBe(webId);
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
      let url = await state.startSession(clientId);
      const res = await state.fetchIdp(url);
      expect(res.status).toBe(200);
      url = await state.login(url, email, password);

      // Verify the client information the server discovered
      const consentRes = await state.fetchIdp(url, 'GET');
      expect(consentRes.status).toBe(200);
      const { client } = await consentRes.json();
      expect(client.client_id).toBe(clientJson.client_id);
      expect(client.client_name).toBe(clientJson.client_name);

      await state.consent(url);
      expect(state.session.info?.webId).toBe(webId);
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
    const credentialsUrl = joinUrl(baseUrl, '/idp/credentials/');
    const tokenUrl = joinUrl(baseUrl, '.oidc/token');
    let dpopKey: KeyPair;
    let id: string | undefined;
    let secret: string | undefined;
    let accessToken: string | undefined;

    beforeAll(async(): Promise<void> => {
      dpopKey = await generateDpopKeyPair();
    });

    it('can request a credentials token.', async(): Promise<void> => {
      const res = await fetch(credentialsUrl, {
        method: 'POST',
        headers: {
          'content-type': APPLICATION_JSON,
        },
        body: JSON.stringify({ email, password, name: 'token' }),
      });
      expect(res.status).toBe(200);
      ({ id, secret } = await res.json());
      expect(typeof id).toBe('string');
      expect(typeof secret).toBe('string');
      expect(id).toMatch(/^token/u);
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

    it('can see all credentials.', async(): Promise<void> => {
      const res = await fetch(credentialsUrl, {
        method: 'POST',
        headers: {
          'content-type': APPLICATION_JSON,
        },
        body: JSON.stringify({ email, password }),
      });
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual([ id ]);
    });

    it('can delete credentials.', async(): Promise<void> => {
      let res = await fetch(credentialsUrl, {
        method: 'POST',
        headers: {
          'content-type': APPLICATION_JSON,
        },
        body: JSON.stringify({ email, password, delete: id }),
      });
      expect(res.status).toBe(200);

      // Client_credentials call should fail now
      const dpopHeader = await createDpopHeader(tokenUrl, 'POST', dpopKey);
      const authString = `${encodeURIComponent(id!)}:${encodeURIComponent(secret!)}`;
      res = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
          'content-type': APPLICATION_X_WWW_FORM_URLENCODED,
          dpop: dpopHeader,
        },
        body: 'grant_type=client_credentials&scope=webid',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('resetting password', (): void => {
    let nextUrl: string;

    it('sends the corresponding email address through the form to get a mail.', async(): Promise<void> => {
      const res = await postForm(`${baseUrl}idp/forgotpassword/`, stringify({ email }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.email).toBe(email);

      const mail = sendMail.mock.calls[0][0];
      expect(mail.to).toBe(email);
      const match = /(http:.*)$/u.exec(mail.text);
      expect(match).toBeDefined();
      nextUrl = match![1];
      expect(nextUrl).toMatch(/\/resetpassword\/[^/]+$/u);
    });

    it('resets the password through the given link.', async(): Promise<void> => {
      // Extract the submit URL from the reset password form
      let res = await fetch(nextUrl);
      expect(res.status).toBe(200);
      const text = await res.text();
      const relative = load(text)('form').attr('action');
      // Reset password form has no action causing the current URL to be used
      expect(relative).toBeUndefined();

      // Extract recordId from URL since JS is used to add it
      const recordId = /\?rid=([^/]+)$/u.exec(nextUrl)?.[1];
      expect(typeof recordId).toBe('string');

      // POST the new password to the same URL
      const formData = stringify({ password: password2, confirmPassword: password2, recordId });
      res = await fetch(nextUrl, {
        method: 'POST',
        headers: { 'content-type': APPLICATION_X_WWW_FORM_URLENCODED },
        body: formData,
      });
      expect(res.status).toBe(200);
    });
  });

  describe('logging in after password reset', (): void => {
    let state: IdentityTestState;
    let nextUrl: string;

    beforeAll(async(): Promise<void> => {
      state = new IdentityTestState(baseUrl, redirectUrl, oidcIssuer);
    });

    afterAll(async(): Promise<void> => {
      await state.session.logout();
    });

    it('can not log in with the old password anymore.', async(): Promise<void> => {
      const url = await state.startSession();
      nextUrl = url;
      let res = await state.fetchIdp(url);
      expect(res.status).toBe(200);
      const formData = stringify({ email, password });
      res = await state.fetchIdp(url, 'POST', formData, APPLICATION_X_WWW_FORM_URLENCODED);
      expect(res.status).toBe(500);
      expect(await res.text()).toContain('Incorrect password');
    });

    it('can log in with the new password.', async(): Promise<void> => {
      const url = await state.login(nextUrl, email, password2);
      await state.consent(url);
      expect(state.session.info?.webId).toBe(webId);
    });
  });

  describe('creating pods without registering with the IDP', (): void => {
    let formBody: string;
    let registrationTriple: string;
    const podName = 'myPod';

    beforeAll(async(): Promise<void> => {
      // We will need this twice
      formBody = stringify({
        email: 'bob@test.email',
        webId: webId2,
        password,
        confirmPassword: password,
        podName,
        createPod: 'ok',
      });
    });

    it('sends the form once to receive the registration triple.', async(): Promise<void> => {
      const res = await postForm(`${baseUrl}idp/register/`, formBody);
      expect(res.status).toBe(400);
      const json = await res.json();
      registrationTriple = json.details.quad;
    });

    it('updates the webId with the registration token.', async(): Promise<void> => {
      const patchBody = `INSERT DATA { ${registrationTriple} }`;
      const res = await fetch(webId2, {
        method: 'PATCH',
        headers: { 'content-type': 'application/sparql-update' },
        body: patchBody,
      });
      expect(res.status).toBe(205);
    });

    it('sends the form again to successfully register.', async(): Promise<void> => {
      const res = await postForm(`${baseUrl}idp/register/`, formBody);
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(expect.objectContaining({
        email: 'bob@test.email',
        webId: webId2,
        podBaseUrl: `${baseUrl}${podName}/`,
      }));
    });
  });

  describe('creating a new WebID', (): void => {
    const podName = 'alice';
    const newMail = 'alice@test.email';
    let newWebId: string;
    let state: IdentityTestState;

    const formBody = stringify({
      email: newMail, password, confirmPassword: password, podName, createWebId: 'ok', register: 'ok', createPod: 'ok',
    });

    afterAll(async(): Promise<void> => {
      await state.session.logout();
    });

    it('sends the form to create the WebID and register.', async(): Promise<void> => {
      const res = await postForm(`${baseUrl}idp/register/`, formBody);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(expect.objectContaining({
        webId: expect.any(String),
        email: newMail,
        oidcIssuer: baseUrl,
        podBaseUrl: `${baseUrl}${podName}/`,
      }));
      newWebId = json.webId;
    });

    it('initializes the session and logs in.', async(): Promise<void> => {
      state = new IdentityTestState(baseUrl, redirectUrl, oidcIssuer);
      let url = await state.startSession();
      const res = await state.fetchIdp(url);
      expect(res.status).toBe(200);
      url = await state.login(url, newMail, password);
      await state.consent(url);
      expect(state.session.info?.webId).toBe(newWebId);
    });

    it('can only write to the new profile when using the logged in session.', async(): Promise<void> => {
      const patchOptions = {
        method: 'PATCH',
        headers: { 'content-type': 'application/sparql-update' },
        body: `INSERT DATA { <> <http://www.w3.org/2000/01/rdf-schema#label> "A cool WebID." }`,
      };

      let res = await fetch(newWebId, patchOptions);
      expect(res.status).toBe(401);

      res = await state.session.fetch(newWebId, patchOptions);
      expect(res.status).toBe(205);
    });

    it('always has control over data in the pod.', async(): Promise<void> => {
      const podBaseUrl = `${baseUrl}${podName}/`;
      const brokenAcl = '<#authorization> a <http://www.w3.org/ns/auth/acl#Authorization> .';

      // Make the acl file unusable
      let res = await state.session.fetch(`${podBaseUrl}.acl`, {
        method: 'PUT',
        headers: { 'content-type': 'text/turtle' },
        body: brokenAcl,
      });
      expect(res.status).toBe(205);

      // The owner is locked out of their own pod due to a faulty acl file
      res = await state.session.fetch(podBaseUrl);
      expect(res.status).toBe(403);

      const fixedAcl = `@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.

<#authorization>
    a               acl:Authorization;
    acl:agentClass  foaf:Agent;
    acl:mode        acl:Read;
    acl:accessTo    <./>.`;
      // Owner can still update the acl
      res = await state.session.fetch(`${podBaseUrl}.acl`, {
        method: 'PUT',
        headers: { 'content-type': 'text/turtle' },
        body: fixedAcl,
      });
      expect(res.status).toBe(205);

      // Access is possible again
      res = await state.session.fetch(podBaseUrl);
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
      const res = await fetch(`${baseUrl}.oidc/auth`);
      expect(res.status).toBe(400);
      await expect(res.text()).resolves.toContain('InvalidRequest: invalid_request');
    });
  });
});
