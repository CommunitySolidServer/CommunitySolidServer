import { createDpopHeader, generateDpopKeyPair } from '@inrupt/solid-client-authn-core';
import fetch from 'cross-fetch';
import { copy, readdir } from 'fs-extra';
import type { App } from '../../src/init/App';
import { APPLICATION_X_WWW_FORM_URLENCODED } from '../../src/util/ContentTypes';
import { joinFilePath, joinUrl, resolveAssetPath } from '../../src/util/PathUtil';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, getTestFolder, instantiateFromConfig, removeFolder } from './Config';
import { IdentityTestState } from './IdentityTestState';

// This port needs to remain fixed as the assets used are generated with this port in mind
const port = getPort('V6Migration');
const baseUrl = `http://localhost:${port}/`;
const rootFilePath = getTestFolder('v6-migration');
const assetPath = resolveAssetPath('@css:test/assets/migration/v6/');

// Prevent panva/node-openid-client from emitting DraftWarning
jest.spyOn(process, 'emitWarning').mockImplementation();

describe('A server migrating from v6', (): void => {
  let app: App;

  beforeAll(async(): Promise<void> => {
    await removeFolder(rootFilePath);
    const variables = {
      ...getDefaultVariables(port, baseUrl),
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
      // Skip the confirmation prompt
      'urn:solid-server:default:variable:confirmMigration': true,
    };

    // Create and start the server
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      [
        getTestConfigPath('file-pod.json'),
      ],
      variables,
    ) as Record<string, any>;
    ({ app } = instances);

    // Move the v6 internal data to the server
    await copy(assetPath, rootFilePath);
  });

  afterAll(async(): Promise<void> => {
    // Await removeFolder(rootFilePath);
    await app.stop();
  });

  it('can start the server to migrate the data.', async(): Promise<void> => {
    // This is going to trigger the migration step
    await expect(app.start()).resolves.toBeUndefined();

    // If migration was successful, there should be no files left in these folders
    const accountDir = await readdir(joinFilePath(rootFilePath, '.internal/accounts/'));
    expect(accountDir).toEqual(expect.arrayContaining([ 'data', 'index', 'credentials' ]));
    const credentialsDir = await readdir(joinFilePath(rootFilePath, '.internal/accounts/credentials/'));
    expect(credentialsDir).toEqual([]);
    const forgotDir = await readdir(joinFilePath(rootFilePath, '.internal/forgot-password/'));
    expect(forgotDir).toEqual([]);

    // Setup resources should have been migrated
    const setupDir = await readdir(joinFilePath(rootFilePath, '.internal/setup/'));
    expect(setupDir).toEqual([
      // Invalid JSON file was not deleted, only error was logged. Just in case its data needs to be saved.
      'aW52YWxpZFJlc291cmNl$.json',
      'current-base-url$.json',
      'current-server-version$.json',
      'setupCompleted-2.0$.json',
      'v6-migration$.json',
    ]);
  });

  it('still allows existing accounts to log in.', async(): Promise<void> => {
    const indexUrl = joinUrl(baseUrl, '.account/');
    let res = await fetch(indexUrl);
    expect(res.status).toBe(200);
    const { controls } = await res.json();

    res = await fetch(controls.password.login, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
    });
    expect(res.status).toBe(200);

    res = await fetch(controls.password.login, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test2@example.com', password: 'password2' }),
    });
    expect(res.status).toBe(200);
  });

  it('still gives control access to pod owners.', async(): Promise<void> => {
    // Init
    const state = new IdentityTestState(baseUrl, 'http://mockedredirect/', baseUrl);
    let url = await state.initSession();
    expect(url.startsWith(baseUrl)).toBeTruthy();
    url = await state.handleRedirect(url);

    // Log in
    let res = await state.fetchIdp(url);
    expect(res.status).toBe(200);
    const { controls } = await res.json();
    res = await state.fetchIdp(
      controls.password.login,
      'POST',
      JSON.stringify({ email: 'test@example.com', password: 'password' }),
    );
    await state.handleLocationRedirect(res);

    res = await state.fetchIdp(controls.oidc.webId);
    expect(res.status).toBe(200);

    // Pick WebID
    const webId = joinUrl(baseUrl, 'test/profile/card#me');
    res = await state.fetchIdp(controls.oidc.webId, 'POST', { webId, remember: true });
    await state.handleLocationRedirect(res);

    // Consent
    res = await state.fetchIdp(controls.oidc.consent, 'POST');

    // Redirect back to the client and verify login success
    await state.handleIncomingRedirect(res, webId);

    // GET the root ACL (which is initialized as an empty file with the given comment)
    url = joinUrl(baseUrl, 'test/.acl');
    res = await state.session.fetch(url);
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe('# Test comment for integration test\n');

    // Log out of session again
    await state.session.logout();
  });

  it('still supports the existing client credentials.', async(): Promise<void> => {
    // These are the values stored in the original assets
    const id = 'token_fd13b73d-2527-4280-82af-278e5b8fe607';
    const secret = 'a809d7ce5daf0e9acd457c91d712ff05038e4a87192e27191c837602bd4b' +
      '370c633282864c133650b0e9a35b59018b064157532642f628affb2f79e81999e898';
    const tokenUrl = joinUrl(baseUrl, '.oidc/token');
    const dpopHeader = await createDpopHeader(tokenUrl, 'POST', await generateDpopKeyPair());
    const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
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
    const { access_token: accessToken } = await res.json();
    expect(typeof accessToken).toBe('string');
  });
});
