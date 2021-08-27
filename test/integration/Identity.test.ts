import { stringify } from 'querystring';
import { URL } from 'url';
import { load } from 'cheerio';
import type { Response } from 'cross-fetch';
import { fetch } from 'cross-fetch';
import type { App } from '../../src/init/App';
import { APPLICATION_X_WWW_FORM_URLENCODED } from '../../src/util/ContentTypes';
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

/**
 * Extracts the registration triple from the registration form body.
 */
function extractRegistrationTriple(body: string, webId: string): string {
  const error = load(body)('p.error').first().text();
  const regex = new RegExp(
    `<${webId}>\\s+<http://www.w3.org/ns/solid/terms#oidcIssuerRegistrationToken>\\s+"[^"]+"\\s*\\.`, 'u',
  );
  const match = regex.exec(error);
  expect(match).toHaveLength(1);
  return match![0];
}

// No way around the cookies https://github.com/panva/node-oidc-provider/issues/552 .
// They will be simulated by storing the values and passing them along.
// This is why the redirects are handled manually.
// We also need to parse the HTML in several steps since there is no API.
describe('A Solid server with IDP', (): void => {
  let app: App;
  const redirectUrl = 'http://mockedredirect/';
  const oidcIssuer = baseUrl;
  const card = joinUrl(baseUrl, 'profile/card');
  const webId = `${card}#me`;
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
    const turtle = `<${webId}> <http://www.w3.org/ns/solid/terms#oidcIssuer> <${baseUrl}> .`;
    await fetch(card, {
      method: 'PUT',
      headers: { 'content-type': 'text/turtle' },
      body: turtle,
    });
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
      const res = await postForm(`${baseUrl}idp/register`, formBody);
      expect(res.status).toBe(400);
      registrationTriple = extractRegistrationTriple(await res.text(), webId);
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
      const res = await postForm(`${baseUrl}idp/register`, formBody);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toMatch(new RegExp(`your.WebID.*${webId}`, 'u'));
      expect(text).toMatch(new RegExp(`your.email.address.*${email}`, 'u'));
      expect(text).toMatch(new RegExp(`<code>&lt;${webId}&gt; &lt;http://www.w3.org/ns/solid/terms#oidcIssuer&gt; &lt;${baseUrl}&gt;\\.</code>`, 'mu'));
    });
  });

  describe('authenticating', (): void => {
    let state: IdentityTestState;
    const container = new URL('secret/', baseUrl).href;

    beforeAll(async(): Promise<void> => {
      state = new IdentityTestState(baseUrl, redirectUrl, oidcIssuer);

      // Create container where only webId can write
      const turtle = `
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
<#owner> a acl:Authorization;
         acl:agent <${webId}>;
         acl:accessTo <./>;
         acl:default <./>;
         acl:mode acl:Read, acl:Write, acl:Control.
`;
      await fetch(`${container}.acl`, {
        method: 'PUT',
        headers: { 'content-type': 'text/turtle' },
        body: turtle,
      });
    });

    it('initializes the session and logs in.', async(): Promise<void> => {
      const url = await state.startSession();
      await state.parseLoginPage(url);
      await state.login(url, email, password);
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
      const url = await state.startSession();

      let res = await state.fetchIdp(url);
      expect(res.status).toBe(200);

      res = await state.fetchIdp(url, 'POST', '', APPLICATION_X_WWW_FORM_URLENCODED);
      const nextUrl = res.headers.get('location');
      expect(typeof nextUrl).toBe('string');

      await state.handleLoginRedirect(nextUrl!);
      expect(state.session.info?.webId).toBe(webId);
    });
  });

  describe('resetting password', (): void => {
    let nextUrl: string;

    it('sends the corresponding email address through the form to get a mail.', async(): Promise<void> => {
      const res = await postForm(`${baseUrl}idp/forgotpassword`, stringify({ email }));
      expect(res.status).toBe(200);
      expect(load(await res.text())('form p').first().text().trim())
        .toBe('If your account exists, an email has been sent with a link to reset your password.');

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

      // POST the new password to the same URL
      const formData = stringify({ password: password2, confirmPassword: password2 });
      res = await fetch(nextUrl, {
        method: 'POST',
        headers: { 'content-type': APPLICATION_X_WWW_FORM_URLENCODED },
        body: formData,
      });
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('Your password was successfully reset.');
    });
  });

  describe('logging in after password reset', (): void => {
    let state: IdentityTestState;
    let nextUrl: string;

    beforeAll(async(): Promise<void> => {
      state = new IdentityTestState(baseUrl, redirectUrl, oidcIssuer);
    });

    it('can not log in with the old password anymore.', async(): Promise<void> => {
      const url = await state.startSession();
      nextUrl = url;
      await state.parseLoginPage(url);
      const formData = stringify({ email, password });
      const res = await state.fetchIdp(url, 'POST', formData, APPLICATION_X_WWW_FORM_URLENCODED);
      expect(res.status).toBe(500);
      expect(await res.text()).toContain('Incorrect password');
    });

    it('can log in with the new password.', async(): Promise<void> => {
      await state.login(nextUrl, email, password2);
      expect(state.session.info?.webId).toBe(webId);
    });
  });

  describe('creating pods without registering', (): void => {
    let formBody: string;
    let registrationTriple: string;
    const podName = 'myPod';

    beforeAll(async(): Promise<void> => {
      // We will need this twice
      formBody = stringify({ email, webId, podName, createPod: 'ok' });
    });

    it('sends the form once to receive the registration triple.', async(): Promise<void> => {
      const res = await postForm(`${baseUrl}idp/register`, formBody);
      expect(res.status).toBe(400);
      registrationTriple = extractRegistrationTriple(await res.text(), webId);
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
      const res = await postForm(`${baseUrl}idp/register`, formBody);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toMatch(new RegExp(`Your new Pod.*${baseUrl}${podName}/`, 'u'));
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

    it('sends the form to create the WebID and register.', async(): Promise<void> => {
      const res = await postForm(`${baseUrl}idp/register`, formBody);
      expect(res.status).toBe(200);
      const text = await res.text();

      const matchWebId = /Your new WebID is [^>]+>([^<]+)/u.exec(text);
      expect(matchWebId).toBeDefined();
      expect(matchWebId).toHaveLength(2);
      newWebId = matchWebId![1];
      expect(text).toMatch(new RegExp(`new WebID is.*${newWebId}`, 'u'));
      expect(text).toMatch(new RegExp(`your email address.*${newMail}`, 'u'));
      expect(text).toMatch(new RegExp(`Your new Pod.*${baseUrl}${podName}/`, 'u'));
    });

    it('initializes the session and logs in.', async(): Promise<void> => {
      state = new IdentityTestState(baseUrl, redirectUrl, oidcIssuer);
      const url = await state.startSession();
      await state.parseLoginPage(url);
      await state.login(url, newMail, password);
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
  });

  describe('setup', (): void => {
    it('should contain the required configuration keys.', async(): Promise<void> => {
      const res = await fetch(`${baseUrl}.well-known/openid-configuration`);
      const jsonBody = await res.json();

      expect(res.status).toBe(200);
      // https://solid.github.io/authentication-panel/solid-oidc/#discovery
      expect(jsonBody.solid_oidc_supported).toEqual('https://solidproject.org/TR/solid-oidc');
    });

    it('should return correct error output.', async(): Promise<void> => {
      const res = await fetch(`${baseUrl}idp/auth`);
      expect(res.status).toBe(400);
      await expect(res.text()).resolves.toContain('InvalidRequest: invalid_request');
    });
  });
});
