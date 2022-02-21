import fetch from 'cross-fetch';
import type { App } from '../../src/init/App';
import { LDP } from '../../src/util/Vocabularies';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, instantiateFromConfig } from './Config';

const port = getPort('ServerFetch');
const baseUrl = `http://localhost:${port}/`;

// Some tests with real Requests/Responses until the mocking library has been removed from the tests
describe('A Solid server', (): void => {
  let app: App;

  beforeAll(async(): Promise<void> => {
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      getTestConfigPath('server-memory.json'),
      getDefaultVariables(port, baseUrl),
    ) as Record<string, any>;
    ({ app } = instances);
    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  it('can do a successful HEAD request to a container.', async(): Promise<void> => {
    const res = await fetch(baseUrl, { method: 'HEAD' });
    expect(res.status).toBe(200);
  });

  it('can do a successful HEAD request to a container without accept headers.', async(): Promise<void> => {
    const res = await fetch(baseUrl, { method: 'HEAD', headers: { accept: '' }});
    expect(res.status).toBe(200);
  });

  it('can do a successful HEAD request to a document.', async(): Promise<void> => {
    const url = `${baseUrl}.acl`;
    const res = await fetch(url, { method: 'HEAD' });
    expect(res.status).toBe(200);
  });

  it('can do a successful HEAD request to a document without accept headers.', async(): Promise<void> => {
    const url = `${baseUrl}.acl`;
    const res = await fetch(url, { method: 'HEAD', headers: { accept: '' }});
    expect(res.status).toBe(200);
  });

  it('can do a successful GET request to a container.', async(): Promise<void> => {
    const res = await fetch(baseUrl);
    expect(res.status).toBe(200);
  });

  it('can do a successful GET request to a container without accept headers.', async(): Promise<void> => {
    const res = await fetch(baseUrl, { headers: { accept: '' }});
    expect(res.status).toBe(200);
  });

  it('can do a successful GET request to a document.', async(): Promise<void> => {
    const url = `${baseUrl}.acl`;
    const res = await fetch(url);
    expect(res.status).toBe(200);
  });

  it('can do a successful GET request to a document without accept headers.', async(): Promise<void> => {
    const url = `${baseUrl}.acl`;
    const res = await fetch(url, { headers: { accept: '' }});
    expect(res.status).toBe(200);
  });

  it('can PUT to containers.', async(): Promise<void> => {
    const url = `${baseUrl}containerPUT/`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'content-type': 'text/turtle',
      },
      body: '<a:b> <a:b> <a:b>.',
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(url);
  });

  it('can PUT to resources.', async(): Promise<void> => {
    const url = `${baseUrl}resourcePUT`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'content-type': 'text/turtle',
      },
      body: '<a:b> <a:b> <a:b>.',
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(url);
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
    expect(res.status).toBe(400);
  });

  it('can POST to create a container.', async(): Promise<void> => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'text/turtle',
        slug: 'containerPOST/',
        link: `<${LDP.Container}>; rel="type"`,
      },
      body: `<a:b> <a:b> <a:b>.`,
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(`${baseUrl}containerPOST/`);
  });

  it('can POST to create a document.', async(): Promise<void> => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'text/turtle',
        slug: 'resourcePOST',
      },
      body: '<a:b> <a:b> <a:b>.',
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(`${baseUrl}resourcePOST`);
  });

  it('can DELETE containers.', async(): Promise<void> => {
    const url = `${baseUrl}containerDELETE/`;
    await fetch(url, {
      method: 'PUT',
      headers: {
        'content-type': 'text/turtle',
      },
      body: '<a:b> <a:b> <a:b>.',
    });
    const res = await fetch(url, { method: 'DELETE' });
    expect(res.status).toBe(205);
  });

  it('can DELETE documents.', async(): Promise<void> => {
    const url = `${baseUrl}resourceDELETE`;
    await fetch(url, {
      method: 'PUT',
      headers: {
        'content-type': 'text/turtle',
      },
      body: '<a:b> <a:b> <a:b>.',
    });
    const res = await fetch(url, { method: 'DELETE' });
    expect(res.status).toBe(205);
  });

  it('can PATCH documents.', async(): Promise<void> => {
    const url = `${baseUrl}resourcePATCH`;
    await fetch(url, {
      method: 'PUT',
      headers: {
        'content-type': 'text/turtle',
      },
      body: '<a:b> <a:b> <a:b>.',
    });
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/sparql-update',
      },
      body: 'INSERT DATA { <b:b> <b:b> <b:b>. }',
    });
    expect(res.status).toBe(205);
  });

  it('can PATCH containers.', async(): Promise<void> => {
    const url = `${baseUrl}containerPATCH/`;
    await fetch(url, {
      method: 'PUT',
      headers: {
        'content-type': 'text/turtle',
      },
      body: '<a:b> <a:b> <a:b>.',
    });
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/sparql-update',
      },
      body: 'INSERT DATA { <b:b> <b:b> <b:b>. }',
    });
    expect(res.status).toBe(205);
  });
});
