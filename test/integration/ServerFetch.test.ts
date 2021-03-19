import type { Server } from 'http';
import fetch from 'cross-fetch';
import type { Initializer } from '../../src/init/Initializer';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { joinFilePath } from '../../src/util/PathUtil';
import { instantiateFromConfig } from './Config';

const port = 6004;
const baseUrl = `http://localhost:${port}/`;

// Some tests with real Requests/Responses until the mocking library has been removed from the tests
describe('A Solid server', (): void => {
  let server: Server;
  let initializer: Initializer;
  let factory: HttpServerFactory;

  beforeAll(async(): Promise<void> => {
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances', 'server-memory.json', {
        'urn:solid-server:default:variable:port': port,
        'urn:solid-server:default:variable:baseUrl': baseUrl,
        'urn:solid-server:default:variable:podTemplateFolder': joinFilePath(__dirname, '../assets/templates'),
        'urn:solid-server:default:variable:webViewsFolder': '',
      },
    ) as Record<string, any>;
    ({ factory, initializer } = instances);
    await initializer.handleSafe();
    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    await new Promise<void>((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
  });

  it('can GET results from a container.', async(): Promise<void> => {
    const res = await fetch(baseUrl);
    expect(res.status).toBe(200);
  });

  it('can GET results from a resource.', async(): Promise<void> => {
    const url = `${baseUrl}.acl`;
    const res = await fetch(url);
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
    expect(res.status).toBe(205);
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
    expect(res.status).toBe(205);
  });

  it('can POST to create a container.', async(): Promise<void> => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'text/turtle',
        slug: 'containerPOST/',
      },
      body: '<a:b> <a:b> <a:b>.',
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(`${baseUrl}containerPOST/`);
  });

  it('can POST to create a resource.', async(): Promise<void> => {
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

  it('can DELETE resources.', async(): Promise<void> => {
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

  it('can PATCH resources.', async(): Promise<void> => {
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
});
