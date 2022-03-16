import fetch from 'cross-fetch';
import { parse, splitCookiesString } from 'set-cookie-parser';
import type { App } from '../../src/init/App';
import { APPLICATION_X_WWW_FORM_URLENCODED } from '../../src/util/ContentTypes';
import { joinUrl } from '../../src/util/PathUtil';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, instantiateFromConfig } from './Config';

const port = getPort('Accounts');
const baseUrl = `http://localhost:${port}/`;

// Don't send actual e-mails
jest.mock('nodemailer');

describe('A server with account management', (): void => {
  let app: App;
  let sendMail: jest.Mock;

  let cookie: string;
  const email = 'test@example.com';
  let password = 'secret';
  const indexUrl = joinUrl(baseUrl, '.account/');
  let controls: {
    main: Record<'index' | 'logins', string>;
    account: Record<'create' | 'account' | 'logout' | 'pod' | 'webId' | 'clientCredentials', string>;
    password: Record<'login' | 'forgot' | 'create', string>;
  };
  let passwordResource: string;
  let pod: string;
  let webId: string;

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

    controls = { main: {}, account: {}, login: {}, password: {}} as any;
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  it('can get the general index.', async(): Promise<void> => {
    const res = await fetch(indexUrl);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.controls.main.index).toBe(indexUrl);
    expect(json.controls.main.logins).toBeDefined();
    controls.main = json.controls.main;

    expect(json.controls.account.create).toBeDefined();
    controls.account = json.controls.account;

    expect(json.controls.password.login).toBeDefined();
    expect(json.controls.password.forgot).toBeDefined();
    controls.password = json.controls.password;

    expect(json.controls.html).toBeDefined();
    expect(json.controls.html.main).toBeDefined();
    expect(json.controls.html.password).toBeDefined();
  });

  it('can create an account.', async(): Promise<void> => {
    const res = await fetch(controls.account.create, { method: 'POST' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.resource).toBeDefined();
    expect(res.headers.get('set-cookie')).toBeDefined();
    const cookies = parse(splitCookiesString(res.headers.get('set-cookie')!));
    expect(cookies).toHaveLength(1);

    cookie = `${cookies[0].name}=${cookies[0].value}`;
    expect(json.cookie).toBe(cookies[0].value);

    controls.account.account = json.resource;
  });

  it('can access the account using the cookie.', async(): Promise<void> => {
    expect((await fetch(controls.account.account)).status).toBe(401);
    const res = await fetch(controls.account.account, { headers: { cookie }});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.controls.account.account).toEqual(controls.account.account);
    expect(json.controls.account.logout).toBeDefined();
    expect(json.controls.account.pod).toBeDefined();
    expect(json.controls.account.webId).toBeDefined();
    expect(json.controls.account.clientCredentials).toBeDefined();

    controls.account = json.controls.account;

    expect(json.controls.password.create).toBeDefined();
    controls.password = json.controls.password;

    expect(json.controls.html.account).toBeDefined();
  });

  it('can also access the account using the custom authorization header.', async(): Promise<void> => {
    expect((await fetch(controls.account.account)).status).toBe(401);
    const res = await fetch(controls.account.account, { headers:
        { authorization: `CSS-Account-Cookie ${cookie.split('=')[1]}` }});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.controls.account.account).toEqual(controls.account.account);
  });

  it('can not create a pod since the account has no login.', async(): Promise<void> => {
    const res = await fetch(controls.account.pod, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe('An account needs at least 1 login method.');
  });

  it('can add a password login to the account.', async(): Promise<void> => {
    let res = await fetch(controls.password.create, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.resource).toBeDefined();
    ({ resource: passwordResource } = json);

    // Verify if the content was added to the profile
    res = await fetch(controls.account.account, { headers: { cookie }});
    expect(res.status).toBe(200);
    expect((await res.json()).logins.password).toEqual({ [email]: passwordResource });
  });

  it('can not delete its last login method.', async(): Promise<void> => {
    const res = await fetch(passwordResource, { method: 'DELETE', headers: { cookie }});
    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe('An account needs at least 1 login method.');
  });

  it('can not use the same email for a different account.', async(): Promise<void> => {
    let res = await fetch(controls.account.create, { method: 'POST' });
    const cookies = parse(splitCookiesString(res.headers.get('set-cookie')!));
    const newCookie = `${cookies[0].name}=${cookies[0].value}`;
    const { resource } = await res.json();

    res = await fetch(resource, { headers: { cookie: newCookie }});
    const oldAccount: { controls: typeof controls } = await res.json();

    // This will fail because the email address is already used by a different account
    res = await fetch(oldAccount.controls.password.create, {
      method: 'POST',
      headers: { cookie: newCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(res.status).toBe(400);

    // Make sure the account still has no login method
    res = await fetch(resource, { headers: { cookie: newCookie }});
    await expect(res.json()).resolves.toEqual(oldAccount);
  });

  it('can log out.', async(): Promise<void> => {
    const res = await fetch(controls.account.logout, { method: 'POST', headers: { cookie }});
    expect(res.status).toBe(200);
    // Cookie doesn't work anymore
    expect((await fetch(controls.account.account, { headers: { cookie }})).status).toBe(401);
  });

  it('can login again with email/password.', async(): Promise<void> => {
    const res = await fetch(controls.password.login, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(res.status).toBe(200);

    const cookies = parse(splitCookiesString(res.headers.get('set-cookie')!));
    expect(cookies).toHaveLength(1);
    cookie = `${cookies[0].name}=${cookies[0].value}`;
    // Cookie is valid again
    expect((await fetch(controls.account.account, { headers: { cookie }})).status).toBe(200);
  });

  it('can change the password.', async(): Promise<void> => {
    let res = await fetch(passwordResource, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        oldPassword: password,
        newPassword: 'secret2',
      }),
    });
    password = 'secret2';
    expect(res.status).toBe(200);

    // Check new password
    res = await fetch(controls.password.login, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toBeDefined();
  });

  it('can create a pod.', async(): Promise<void> => {
    let res = await fetch(controls.account.pod, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });
    expect(res.status).toBe(200);
    let json = await res.json();
    expect(json.pod).toBeDefined();
    expect(json.podResource).toBeDefined();
    expect(json.webId).toBeDefined();
    expect(json.webIdResource).toBeDefined();
    ({ pod, webId } = json);

    // Verify if the content was added to the profile
    res = await fetch(controls.account.account, { headers: { cookie }});
    expect(res.status).toBe(200);
    json = await res.json();
    expect(json.pods[pod]).toBeDefined();
    expect(json.webIds[webId]).toBeDefined();
  });

  it('does not store any data if creating a pod fails on the same account.', async(): Promise<void> => {
    let res = await fetch(controls.account.account, { headers: { cookie }});
    const oldAccount = await res.json();

    res = await fetch(controls.account.pod, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });
    expect(res.status).toBe(400);

    // Verify nothing was added
    res = await fetch(controls.account.account, { headers: { cookie }});
    await expect(res.json()).resolves.toEqual(oldAccount);
  });

  it('does not store any data if creating a pod fails on a different account.', async(): Promise<void> => {
    // We have to create a new account here to try to create a pod with the same name.
    // Otherwise the server will never try to write data
    // since it would notice the account already has a pod with that name.
    let res = await fetch(controls.account.create, { method: 'POST' });
    const cookies = parse(splitCookiesString(res.headers.get('set-cookie')!));
    const newCookie = `${cookies[0].name}=${cookies[0].value}`;
    res = await fetch(indexUrl, { headers: { cookie: newCookie }});
    const json: { controls: typeof controls } = await res.json();
    res = await fetch(json.controls.password.create, {
      method: 'POST',
      headers: { cookie: newCookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'differentMail@example.com',
        password,
      }),
    });
    expect(res.status).toBe(200);

    res = await fetch(json.controls.account.account, { headers: { cookie: newCookie }});
    const oldAccount = await res.json();

    // This will fail because there already is a pod with this name
    res = await fetch(json.controls.account.pod, {
      method: 'POST',
      headers: { cookie: newCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain('Pod creation failed');

    // Make sure there is no reference in the account data
    res = await fetch(json.controls.account.account, { headers: { cookie: newCookie }});
    await expect(res.json()).resolves.toEqual(oldAccount);
  });

  it('can remove the WebID link.', async(): Promise<void> => {
    let res = await fetch(controls.account.account, { headers: { cookie }});
    const webIdResource = (await res.json()).webIds[webId];
    res = await fetch(webIdResource, { method: 'DELETE', headers: { cookie }});
    expect(res.status).toBe(200);
    res = await fetch(controls.account.account, { headers: { cookie }});
    expect((await res.json()).webIds[webId]).toBeUndefined();
  });

  it('can link the WebID again.', async(): Promise<void> => {
    let res = await fetch(controls.account.webId, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ webId }),
    });
    expect(res.status).toBe(200);
    let json = await res.json();
    expect(json.resource).toBeDefined();
    expect(json.oidcIssuer).toBe(baseUrl);

    // Verify if the content was added to the profile
    res = await fetch(controls.account.account, { headers: { cookie }});
    expect(res.status).toBe(200);
    json = await res.json();
    expect(json.webIds[webId]).toBeDefined();
  });

  it('needs to prove ownership when linking a WebID outside of a pod.', async(): Promise<void> => {
    const otherWebId = joinUrl(baseUrl, 'other#me');
    // Create the WebID
    let res = await fetch(otherWebId, {
      method: 'PUT',
      headers: { 'content-type': 'text/turtle' },
      body: '',
    });
    expect(res.status).toBe(201);

    // Try to link the WebID
    res = await fetch(controls.account.webId, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ webId: otherWebId }),
    });
    expect(res.status).toBe(400);
    let json = await res.json();
    expect(json.details?.quad).toBeDefined();
    const { quad } = json.details;

    // Update the WebID with the identifying quad
    await fetch(otherWebId, {
      method: 'PUT',
      headers: { 'content-type': 'text/turtle' },
      body: quad,
    });

    // Try to link the WebID again
    res = await fetch(controls.account.webId, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ webId: otherWebId }),
    });
    expect(res.status).toBe(200);

    // Verify if the content was added to the profile
    res = await fetch(controls.account.account, { headers: { cookie }});
    expect(res.status).toBe(200);
    json = await res.json();
    // 2 linked WebIDs now
    expect(json.webIds[webId]).toBeDefined();
    expect(json.webIds[otherWebId]).toBeDefined();
  });

  it('can create a client credentials token.', async(): Promise<void> => {
    let res = await fetch(controls.account.clientCredentials, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'token', webId }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toMatch(/^token/u);
    expect(json.secret).toBeDefined();
    expect(json.resource).toBeDefined();
    const { id, resource, secret } = json;

    // Verify if the content was added to the profile
    res = await fetch(controls.account.account, { headers: { cookie }});
    expect(res.status).toBe(200);
    const { clientCredentials } = await res.json();
    expect(clientCredentials[id]).toBe(resource);

    // Request a token
    const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
    res = await fetch(joinUrl(baseUrl, '.oidc/token'), {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
        'content-type': APPLICATION_X_WWW_FORM_URLENCODED,
      },
      body: 'grant_type=client_credentials&scope=webid',
    });
    expect(res.status).toBe(200);
    const { access_token: token } = await res.json();
    expect(token).toBeDefined();
  });

  it('can remove registered WebIDs.', async(): Promise<void> => {
    let res = await fetch(controls.account.account, { headers: { cookie }});
    expect(res.status).toBe(200);
    let json = await res.json();

    res = await fetch(json.webIds[webId], { method: 'DELETE', headers: { cookie }});
    expect(res.status).toBe(200);

    // Make sure it's gone
    res = await fetch(controls.account.account, { headers: { cookie }});
    json = await res.json();
    expect(json.webIds[webId]).toBeUndefined();
  });

  it('can remove credential tokens.', async(): Promise<void> => {
    let res = await fetch(controls.account.account, { headers: { cookie }});
    expect(res.status).toBe(200);
    let json = await res.json();

    const tokenUrl = Object.values(json.clientCredentials)[0] as string;
    res = await fetch(tokenUrl, { method: 'DELETE', headers: { cookie }});
    expect(res.status).toBe(200);

    // Make sure it's gone
    res = await fetch(controls.account.account, { headers: { cookie }});
    json = await res.json();
    expect(Object.keys(json.clientCredentials)).toHaveLength(0);
  });

  it('can reset a password if forgotten.', async(): Promise<void> => {
    let res = await fetch(controls.password.forgot, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    expect(res.status).toBe(200);

    expect(sendMail).toHaveBeenCalledTimes(1);

    // Parse reset URL out of mail
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe(email);
    const match = /(http:.*)$/u.exec(mail.text);
    expect(match).toBeDefined();
    const resetUrl = match![1];
    res = await fetch(resetUrl);
    const url = new URL(resetUrl);
    const recordId = url.searchParams.get('rid');
    expect(recordId).toBeDefined();

    // Reset the password
    password = 'resetSecret';
    res = await fetch(resetUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recordId, password }),
    });
    expect(res.status).toBe(200);

    // Verify logging in with the new password works
    res = await fetch(controls.password.login, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toBeDefined();
  });
});
