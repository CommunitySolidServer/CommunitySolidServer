import fetch from 'cross-fetch';
import type { App } from '../../src/init/App';
import { joinUrl } from '../../src/util/PathUtil';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, instantiateFromConfig } from './Config';

const port = getPort('SetupMemory');
const baseUrl = `http://localhost:${port}/`;

// Some tests with real Requests/Responses until the mocking library has been removed from the tests
describe('A Solid server with setup', (): void => {
  const email = 'test@test.email';
  const password = 'password!';
  const podName = 'test';
  const setupUrl = joinUrl(baseUrl, '/setup');
  let app: App;

  // `beforeEach` since the server needs to restart to reset setup
  beforeEach(async(): Promise<void> => {
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      getTestConfigPath('setup-memory.json'),
      getDefaultVariables(port, baseUrl),
    ) as Record<string, any>;
    ({ app } = instances);
    await app.start();
  });

  afterEach(async(): Promise<void> => {
    await app.stop();
  });

  it('catches all requests.', async(): Promise<void> => {
    let res = await fetch(baseUrl, { method: 'GET', headers: { accept: 'text/html' }});
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain('Set up your Solid server');

    res = await fetch(joinUrl(baseUrl, '/random/path/'), { method: 'GET', headers: { accept: 'text/html' }});
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain('Set up your Solid server');

    res = await fetch(joinUrl(baseUrl, '/random/path/'), { method: 'PUT', headers: { accept: 'text/html' }});
    expect(res.status).toBe(405);
    await expect(res.text()).resolves.toContain('Set up your Solid server');
  });

  it('can create a server that disables root but allows registration.', async(): Promise<void> => {
    let res = await fetch(setupUrl, { method: 'POST', headers: { accept: 'text/html' }});
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain('Server setup complete');

    // Root access disabled
    res = await fetch(baseUrl);
    expect(res.status).toBe(401);

    // Registration still possible
    const registerParams = { email, podName, password, confirmPassword: password, createWebId: true };
    res = await fetch(joinUrl(baseUrl, 'idp/register/'), {
      method: 'POST',
      headers: { accept: 'text/html', 'content-type': 'application/json' },
      body: JSON.stringify(registerParams),
    });
    expect(res.status).toBe(200);

    res = await fetch(joinUrl(baseUrl, podName, '/profile/card'));
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain('foaf:PersonalProfileDocument');
  });

  it('can create a server with a public root.', async(): Promise<void> => {
    let res = await fetch(setupUrl, {
      method: 'POST',
      headers: { accept: 'text/html', 'content-type': 'application/json' },
      body: JSON.stringify({ initialize: true }),
    });
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain('Server setup complete');

    // Root access enabled
    res = await fetch(baseUrl);
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain('<> a <http://www.w3.org/ns/pim/space#Storage>');

    // Root pod registration is never allowed
    const registerParams = { email, podName, password, confirmPassword: password, createWebId: true, rootPod: true };
    res = await fetch(joinUrl(baseUrl, 'idp/register/'), {
      method: 'POST',
      headers: { accept: 'text/html', 'content-type': 'application/json' },
      body: JSON.stringify(registerParams),
    });
    expect(res.status).toBe(500);
  });

  it('can create a server with a root pod.', async(): Promise<void> => {
    const registerParams = { email, podName, password, confirmPassword: password, createWebId: true, rootPod: true };
    let res = await fetch(setupUrl, {
      method: 'POST',
      headers: { accept: 'text/html', 'content-type': 'application/json' },
      body: JSON.stringify({ registration: true, initialize: true, ...registerParams }),
    });
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain('Server setup complete');

    // Root profile created
    res = await fetch(joinUrl(baseUrl, '/profile/card'));
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain('foaf:PersonalProfileDocument');

    // Pod root is not accessible even though initialize was set to true
    res = await fetch(joinUrl(baseUrl, 'resource'), {
      method: 'PUT',
      headers: { accept: 'text/html', 'content-type': 'text/plain' },
      body: 'random data',
    });
    expect(res.status).toBe(401);
  });
});
