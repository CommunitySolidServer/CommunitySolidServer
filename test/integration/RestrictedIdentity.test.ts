import { fetch } from 'cross-fetch';
import type { App } from '../../src/init/App';
import { joinUrl } from '../../src/util/PathUtil';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, instantiateFromConfig } from './Config';
import { IdentityTestState } from './IdentityTestState';

const port = getPort('RestrictedIdentity');
const baseUrl = `http://localhost:${port}/`;

// Undo the global access token verifier mock
jest.unmock('@solid/access-token-verifier');

// Prevent panva/node-openid-client from emitting DraftWarning
jest.spyOn(process, 'emitWarning').mockImplementation();

describe('A server with restricted IDP access', (): void => {
  let app: App;
  const settings = {
    podName: 'alice',
    email: 'alice@test.email',
    password: 'password',
    confirmPassword: 'password',
    createWebId: true,
    register: true,
    createPod: true,
  };
  const webId = joinUrl(baseUrl, 'alice/profile/card#me');

  beforeAll(async(): Promise<void> => {
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      getTestConfigPath('restricted-idp.json'),
      getDefaultVariables(port, baseUrl),
    ) as Record<string, any>;
    ({ app } = instances);
    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  it('has ACL resources in the relevant containers.', async(): Promise<void> => {
    let res = await fetch(joinUrl(baseUrl, '.well-known/.acl'));
    expect(res.status).toBe(200);

    res = await fetch(joinUrl(baseUrl, 'idp/.acl'));
    expect(res.status).toBe(200);
  });

  it('can create a pod.', async(): Promise<void> => {
    const res = await fetch(`${baseUrl}idp/register/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(settings),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.webId).toBe(webId);
  });

  it('can restrict registration access.', async(): Promise<void> => {
    // Only allow new WebID to register
    const restrictedAcl = `@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.

<#authorization>
    a               acl:Authorization;
    acl:agent       <${webId}>;
    acl:mode        acl:Read, acl:Write, acl:Control;
    acl:accessTo    <./>.`;

    let res = await fetch(`${baseUrl}idp/register/.acl`, {
      method: 'PUT',
      headers: { 'content-type': 'text/turtle' },
      body: restrictedAcl,
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(`${baseUrl}idp/register/.acl`);

    // Registration is now disabled
    res = await fetch(`${baseUrl}idp/register/`);
    expect(res.status).toBe(401);

    res = await fetch(`${baseUrl}idp/register/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ ...settings, email: 'bob@test.email', podName: 'bob' }),
    });
    expect(res.status).toBe(401);
  });

  it('can still access registration with the correct credentials.', async(): Promise<void> => {
    // Logging into session
    const state = new IdentityTestState(baseUrl, 'http://mockedredirect/', baseUrl);
    const url = await state.startSession();
    let res = await state.fetchIdp(url);
    expect(res.status).toBe(200);
    await state.login(url, settings.email, settings.password);
    expect(state.session.info?.webId).toBe(webId);

    // Registration still works for this WebID
    res = await state.session.fetch(`${baseUrl}idp/register/`);
    expect(res.status).toBe(200);

    res = await state.session.fetch(`${baseUrl}idp/register/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ ...settings, email: 'bob@test.email', podName: 'bob' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.webId).toBe(joinUrl(baseUrl, 'bob/profile/card#me'));
  });
});
