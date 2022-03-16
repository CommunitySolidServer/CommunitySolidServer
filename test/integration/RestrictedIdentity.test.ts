import { fetch } from 'cross-fetch';
import type { App } from '../../src/init/App';
import { joinUrl } from '../../src/util/PathUtil';
import { register } from '../util/AccountUtil';
import type { User } from '../util/AccountUtil';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, instantiateFromConfig } from './Config';

const port = getPort('RestrictedIdentity');
const baseUrl = `http://localhost:${port}/`;

// Undo the global access token verifier mock
jest.unmock('@solid/access-token-verifier');

// Prevent panva/node-openid-client from emitting DraftWarning
jest.spyOn(process, 'emitWarning').mockImplementation();

describe('A server with restricted IDP access', (): void => {
  let app: App;
  const user: User = {
    podName: 'alice',
    email: 'alice@test.email',
    password: 'password',
  };
  const webId = joinUrl(baseUrl, 'alice/profile/card#me');
  let controls: any;

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

    res = await fetch(joinUrl(baseUrl, '.account/.acl'));
    expect(res.status).toBe(200);
  });

  it('can create a pod.', async(): Promise<void> => {
    const result = await register(baseUrl, user);
    ({ controls } = result);
    expect(result.webId).toBe(webId);
  });

  it('can restrict account creation.', async(): Promise<void> => {
    // Only allow new WebID to register
    const restrictedAcl = `@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.

<#authorization>
    a               acl:Authorization;
    acl:agent       <${webId}>;
    acl:mode        acl:Read, acl:Write, acl:Control;
    acl:accessTo    <./>.`;

    let res = await fetch(`${controls.account.create}.acl`, {
      method: 'PUT',
      headers: { 'content-type': 'text/turtle' },
      body: restrictedAcl,
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(`${controls.account.create}.acl`);

    // Registration is now disabled
    res = await fetch(controls.account.create);
    expect(res.status).toBe(401);

    res = await fetch(controls.account.create, { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('can still create accounts with the correct credentials.', async(): Promise<void> => {
    // Account creation still works for the WebID
    let res = await fetch(controls.account.create, {
      headers: { authorization: `WebID ${webId}` },
    });
    expect(res.status).toBe(200);

    res = await fetch(controls.account.create, {
      method: 'POST',
      headers: { authorization: `WebID ${webId}` },
    });
    expect(res.status).toBe(200);
  });
});
