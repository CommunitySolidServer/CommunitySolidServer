import fetch from 'cross-fetch';
import { parse, splitCookiesString } from 'set-cookie-parser';
import type { App } from '../../src/init/App';
import { joinUrl } from '../../src/util/PathUtil';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, instantiateFromConfig } from './Config';

const port = getPort('ProfileCardGuard');
const baseUrl = `http://localhost:${port}/`;

/**
 * The full lifecycle of a WebID profile card on a server with the profile card guard:
 *   1. a pod is created with a WebID, registered to the account, and the server is its IDP;
 *   2. the card is protected as long as the WebID is registered;
 *   3. after unlinking the WebID from the account, the card is no longer protected.
 */
describe('A server with the profile card guard', (): void => {
  let app: App;
  let cookie: string;
  let controls: any;
  let cardUrl: string;
  let webId: string;
  const email = 'test@example.com';
  const password = 'secret!';

  beforeAll(async(): Promise<void> => {
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      getTestConfigPath('server-memory-guard.json'),
      getDefaultVariables(port, baseUrl),
    ) as Record<string, any>;
    ({ app } = instances);
    await app.start();

    // Fetch the account controls
    let res = await fetch(joinUrl(baseUrl, '.account/'));
    if (res.status !== 200) {
      throw new Error(`Fetching the controls failed: ${await res.text()}`);
    }
    ({ controls } = await res.json());

    // Create an account, which also logs us in
    res = await fetch(controls.account.create, { method: 'POST' });
    if (res.status !== 200) {
      throw new Error(`Creating the account failed: ${await res.text()}`);
    }
    const cookies = parse(splitCookiesString(res.headers.get('set-cookie')!));
    cookie = `${cookies[0].name}=${cookies[0].value}`;

    // Get the account-specific controls
    res = await fetch(joinUrl(baseUrl, '.account/'), { headers: { cookie }});
    if (res.status !== 200) {
      throw new Error(`Fetching the account controls failed: ${await res.text()}`);
    }
    ({ controls } = await res.json());

    // Add a password login method
    res = await fetch(controls.password.create, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.status !== 200) {
      throw new Error(`Adding the login method failed: ${await res.text()}`);
    }

    // Create a pod, which registers its WebID to the account
    res = await fetch(controls.account.pod, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });
    if (res.status !== 200) {
      throw new Error(`Creating the pod failed: ${await res.text()}`);
    }
    const { webId: createdWebId } = await res.json();
    ({ webId } = { webId: createdWebId });
    cardUrl = webId.slice(0, webId.indexOf('#'));
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  it('creates the card with the server as its issuer.', async(): Promise<void> => {
    const res = await fetch(cardUrl, { headers: { accept: 'text/turtle' }});
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain('solid:oidcIssuer');
    expect(webId).toBe(`${cardUrl}#me`);
  });

  it('forbids deleting the card while its WebID is registered.', async(): Promise<void> => {
    const res = await fetch(cardUrl, { method: 'DELETE' });
    expect(res.status).toBe(403);
  });

  it('rejects a card update that drops the issuer triple.', async(): Promise<void> => {
    const turtle = `<${webId}> <http://www.w3.org/ns/solid/terms#name> "Alice".`;
    const res = await fetch(cardUrl, {
      method: 'PUT',
      headers: { 'content-type': 'text/turtle' },
      body: turtle,
    });
    expect(res.status).toBe(400);
  });

  it('accepts a card update that keeps the issuer triple.', async(): Promise<void> => {
    const turtle = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
<${webId}> solid:oidcIssuer <${baseUrl}>; solid:name "Alice".`;
    const res = await fetch(cardUrl, {
      method: 'PUT',
      headers: { 'content-type': 'text/turtle' },
      body: turtle,
    });
    expect(res.status).toBe(205);
  });

  it('does not protect documents that host no registered WebID.', async(): Promise<void> => {
    const note = joinUrl(baseUrl, 'test/notes');
    let res = await fetch(note, {
      method: 'PUT',
      headers: { 'content-type': 'text/turtle' },
      body: '<http://example.com/note> <http://example.com/value> "note".',
    });
    expect(res.status).toBe(201);
    res = await fetch(note, { method: 'DELETE' });
    expect(res.status).toBe(205);
  });

  it('no longer protects the card after the WebID is unlinked.', async(): Promise<void> => {
    // Unlink the WebID from the account
    let res = await fetch(controls.account.webId, { headers: { cookie }});
    expect(res.status).toBe(200);
    const { webIdLinks } = await res.json();
    expect(webIdLinks[webId]).toBeDefined();

    res = await fetch(webIdLinks[webId], { method: 'DELETE', headers: { cookie }});
    expect(res.status).toBe(200);

    // Verify the WebID is no longer registered
    res = await fetch(controls.account.webId, { headers: { cookie }});
    expect(res.status).toBe(200);
    expect((await res.json()).webIdLinks[webId]).toBeUndefined();

    // The card can now be deleted
    res = await fetch(cardUrl, { method: 'DELETE' });
    expect(res.status).toBe(205);
  });
});
