import fetch from 'cross-fetch';
import type { App } from '../../src/init/App';
import { AppRunner } from '../../src/init/AppRunner';
import { resolveModulePath } from '../../src/util/PathUtil';
import { LDP } from '../../src/util/Vocabularies';
import { getPort } from '../util/Util';
import { getDefaultVariables } from './Config';

const port = getPort('ServerFetch');
const baseUrl = `http://localhost:${port}/`;

// Some tests with real Requests/Responses until the mocking library has been removed from the tests
describe('A Solid server', (): void => {
  const document = `${baseUrl}document`;
  const container = `${baseUrl}container/`;
  let app: App;

  beforeAll(async(): Promise<void> => {
    // Using AppRunner here so it is also tested in an integration test
    app = await new AppRunner().create({
      loaderProperties: {
        mainModulePath: resolveModulePath(''),
        logLevel: 'error',
        typeChecking: false,
      },
      config: resolveModulePath('config/default.json'),
      variableBindings: getDefaultVariables(port, baseUrl),
    });
    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  it('can PUT to containers.', async(): Promise<void> => {
    const res = await fetch(container, {
      method: 'PUT',
      headers: {
        'content-type': 'text/turtle',
      },
      body: '<a:b> <a:b> <a:b>.',
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(container);
  });

  it('can PUT to documents.', async(): Promise<void> => {
    const res = await fetch(document, {
      method: 'PUT',
      headers: {
        'content-type': 'text/turtle',
      },
      body: '<a:b> <a:b> <a:b>.',
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(document);
  });

  it('can do a successful HEAD request to a container.', async(): Promise<void> => {
    const res = await fetch(container, { method: 'HEAD' });
    expect(res.status).toBe(200);
  });

  it('can do a successful HEAD request to a container without accept headers.', async(): Promise<void> => {
    const res = await fetch(container, { method: 'HEAD', headers: { accept: '' }});
    expect(res.status).toBe(200);
  });

  it('can do a successful HEAD request to a document.', async(): Promise<void> => {
    const res = await fetch(document, { method: 'HEAD' });
    expect(res.status).toBe(200);
  });

  it('can do a successful HEAD request to a document without accept headers.', async(): Promise<void> => {
    const res = await fetch(document, { method: 'HEAD', headers: { accept: '' }});
    expect(res.status).toBe(200);
  });

  it('can do a successful GET request to a container.', async(): Promise<void> => {
    const res = await fetch(container);
    expect(res.status).toBe(200);
  });

  it('can do a successful GET request to a container without accept headers.', async(): Promise<void> => {
    const res = await fetch(container, { headers: { accept: '' }});
    expect(res.status).toBe(200);
  });

  it('can do a successful GET request to a document.', async(): Promise<void> => {
    const res = await fetch(document);
    expect(res.status).toBe(200);
  });

  it('can do a successful GET request to a document without accept headers.', async(): Promise<void> => {
    const res = await fetch(document, { headers: { accept: '' }});
    expect(res.status).toBe(200);
  });

  it('can handle PUT errors.', async(): Promise<void> => {
    // There was a specific case where the following request caused the connection to close instead of error
    const res = await fetch(baseUrl, {
      method: 'PUT',
      headers: {
        'content-type': 'text/plain',
      },
      body: '"test"',
    });
    expect(res.status).toBe(409);
    // This container already exists and it can not be edited
    // See https://github.com/solid/community-server/issues/1027#issuecomment-1023371546
  });

  it('can POST to create a container.', async(): Promise<void> => {
    const res = await fetch(container, {
      method: 'POST',
      headers: {
        'content-type': 'text/turtle',
        slug: 'containerPOST/',
        link: `<${LDP.Container}>; rel="type"`,
      },
      body: '<a:b> <a:b> <a:b>.',
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(`${container}containerPOST/`);
  });

  it('can POST to create a document.', async(): Promise<void> => {
    const res = await fetch(container, {
      method: 'POST',
      headers: {
        'content-type': 'text/turtle',
        slug: 'documentPOST',
      },
      body: '<a:b> <a:b> <a:b>.',
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(`${container}documentPOST`);
  });

  it('can DELETE containers.', async(): Promise<void> => {
    const res = await fetch(`${container}containerPOST/`, { method: 'DELETE' });
    expect(res.status).toBe(205);
  });

  it('can DELETE documents.', async(): Promise<void> => {
    const res = await fetch(`${container}documentPOST`, { method: 'DELETE' });
    expect(res.status).toBe(205);
  });

  it('can PATCH documents.', async(): Promise<void> => {
    await fetch(document, {
      method: 'PUT',
      headers: {
        'content-type': 'text/turtle',
      },
      body: '<a:b> <a:b> <a:b>.',
    });
    const res = await fetch(document, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/sparql-update',
      },
      body: 'INSERT DATA { <b:b> <b:b> <b:b>. }',
    });
    expect(res.status).toBe(205);
  });

  it('can not PATCH containers.', async(): Promise<void> => {
    await fetch(container, {
      method: 'PUT',
      headers: {
        'content-type': 'text/turtle',
      },
    });
    const res = await fetch(container, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/sparql-update',
      },
      body: 'INSERT DATA { <b:b> <b:b> <b:b>. }',
    });
    expect(res.status).toBe(409);
  });

  it('can PATCH metadata resources.', async(): Promise<void> => {
    const res = await fetch(`${document}.meta`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/sparql-update',
      },
      body: 'INSERT DATA { <b:b> <b:b> <b:b>. }',
    });
    expect(res.status).toBe(205);
  });
});
