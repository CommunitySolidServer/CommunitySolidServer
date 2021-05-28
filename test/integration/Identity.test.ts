import type { Server } from 'http';
import { stringify } from 'querystring';
import { URL } from 'url';
import { load } from 'cheerio';
import type { Response } from 'cross-fetch';
import { fetch } from 'cross-fetch';
import urljoin from 'url-join';
import type { Initializer } from '../../src/init/Initializer';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import type { WrappedExpiringStorage } from '../../src/storage/keyvalue/WrappedExpiringStorage';
import { APPLICATION_X_WWW_FORM_URLENCODED } from '../../src/util/ContentTypes';
import { joinFilePath } from '../../src/util/PathUtil';
import { getPort } from '../util/Util';
import { getTestConfigPath, instantiateFromConfig } from './Config';
import { IdentityTestState } from './IdentityTestState';

const port = getPort('Identity');
const baseUrl = `http://localhost:${port}/`;

// Undo the global identity token verifier mock
jest.unmock('@solid/identity-token-verifier');

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
  let server: Server;
  let initializer: Initializer;
  let expiringStorage: WrappedExpiringStorage<any, any>;
  let factory: HttpServerFactory;
  const redirectUrl = 'http://mockedredirect/';
  const oidcIssuer = baseUrl;
  const card = urljoin(baseUrl, 'profile/card');
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
      {
        'urn:solid-server:default:variable:baseUrl': baseUrl,
        'urn:solid-server:default:variable:idpTemplateFolder': joinFilePath(__dirname, '../../templates/idp'),
      },
    ) as Record<string, any>;
    ({ factory, initializer, expiringStorage } = instances);
    await initializer.handleSafe();
    server = factory.startServer(port);

    // Create a simple webId
    const turtle = `<${webId}> <http://www.w3.org/ns/solid/terms#oidcIssuer> <${baseUrl}> .`;
    await fetch(card, {
      method: 'PUT',
      headers: { 'content-type': 'text/turtle' },
      body: turtle,
    });
  });

  afterAll(async(): Promise<void> => {
    expiringStorage.finalize();
    await new Promise<void>((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
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
      expect(res.status).toBe(200);
      // eslint-disable-next-line newline-per-chained-call
      registrationTriple = load(await res.text())('form div label').first().text().trim().split('\n')[0];
      expect(registrationTriple).toMatch(new RegExp(
        `^<${webId}> <http://www.w3.org/ns/solid/terms#oidcIssuerRegistrationToken> "[^"]+"\\s*\\.\\s*$`,
        'u',
      ));
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
      expect(text).toMatch(new RegExp(`You can now identify as .*${webId}.*with our IDP using ${email}`, 'u'));
      expect(text).toMatch(new RegExp(`Make sure you add the triple
\\s*&lt;${webId}&gt; &lt;http://www.w3.org/ns/solid/terms#oidcIssuer&gt; &lt;${baseUrl}&gt;\\.
\\s*to your WebID profile\\.`, 'mu'));
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
      const { login } = await state.parseLoginPage(url);
      expect(typeof login).toBe('string');
      await state.login(login, email, password);
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

      // For the following part it is debatable if this is correct but this might be a consequence of the authn client
      const form = await state.extractFormUrl(url);
      expect(form.url.endsWith('/confirm')).toBe(true);

      const res = await state.fetchIdp(form.url, 'POST');
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
      expect(load(await res.text())('form div p').first().text().trim())
        .toBe('If your account exists, an email has been sent with a link to reset your password.');

      const mail = sendMail.mock.calls[0][0];
      expect(mail.to).toBe(email);
      const match = /(http:.*)$/u.exec(mail.text);
      expect(match).toBeDefined();
      nextUrl = match![1];
      expect(nextUrl).toContain('resetpassword?rid=');
    });

    it('resets the password through the given link.', async(): Promise<void> => {
      // Extract the submit URL from the reset password form
      let res = await fetch(nextUrl);
      expect(res.status).toBe(200);
      const text = await res.text();
      const relative = load(text)('form').attr('action');
      expect(typeof relative).toBe('string');

      const recordId = load(text)('input[name="recordId"]').attr('value');
      expect(typeof recordId).toBe('string');

      // POST the new password
      const formData = stringify({ password: password2, confirmPassword: password2, recordId });
      res = await fetch(new URL(relative!, baseUrl).href, {
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

    it('initializes the session.', async(): Promise<void> => {
      const url = await state.startSession();
      const { login } = await state.parseLoginPage(url);
      expect(typeof login).toBe('string');
      nextUrl = login;
    });

    it('can not log in with the old password anymore.', async(): Promise<void> => {
      const formData = stringify({ email, password });
      const res = await state.fetchIdp(nextUrl, 'POST', formData, APPLICATION_X_WWW_FORM_URLENCODED);
      expect(res.status).toBe(200);
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
      expect(res.status).toBe(200);
      // eslint-disable-next-line newline-per-chained-call
      registrationTriple = load(await res.text())('form div label').first().text().trim().split('\n')[0];
      expect(registrationTriple).toMatch(new RegExp(
        `^<${webId}> <http://www.w3.org/ns/solid/terms#oidcIssuerRegistrationToken> "[^"]+"\\s*\\.\\s*$`,
        'u',
      ));
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
      expect(text).toMatch(new RegExp(`Your new pod has been created and can be found at.*${baseUrl}${podName}/`, 'u'));
    });
  });

  describe('creating a new WebID', (): void => {
    const podName = 'alice';
    const newMail = 'alice@test.email';
    let newWebId: string;
    let podLocation: string;
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
      expect(text).toMatch(new RegExp(`You can now identify as .*${newWebId}.*with our IDP using ${newMail}`, 'u'));

      const matchPod = /Your new pod has been created and can be found at [^>]+>([^<]+)/u.exec(text);
      expect(matchPod).toBeDefined();
      expect(matchPod).toHaveLength(2);
      podLocation = matchPod![1];
      expect(newWebId.startsWith(podLocation)).toBe(true);
      expect(podLocation.startsWith(baseUrl)).toBe(true);
    });

    it('initializes the session and logs in.', async(): Promise<void> => {
      state = new IdentityTestState(baseUrl, redirectUrl, oidcIssuer);
      const url = await state.startSession();
      const { login } = await state.parseLoginPage(url);
      expect(typeof login).toBe('string');
      await state.login(login, newMail, password);
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
});
