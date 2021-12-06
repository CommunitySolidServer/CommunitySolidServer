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
      const res = await state.fetchIdp(url);
      expect(res.status).toBe(200);
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

      // Will receive confirm screen here instead of login screen
      res = await state.fetchIdp(url, 'POST', '', APPLICATION_X_WWW_FORM_URLENCODED);
      const json = await res.json();
      const nextUrl = json.location;
      expect(typeof nextUrl).toBe('string');

      await state.handleLoginRedirect(nextUrl);
      expect(state.session.info?.webId).toBe(webId);
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
      await state.login(nextUrl, email, password2);
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
      const url = await state.startSession();
      const res = await state.fetchIdp(url);
      expect(res.status).toBe(200);
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
