import type { Server } from 'http';
import fetch from 'cross-fetch';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { readableToString } from '../../src/util/StreamUtil';
import { instantiateFromConfig } from './Config';

const port = 6003;
const baseUrl = `http://localhost:${port}/`;

describe('A server with a pod handler', (): void => {
  let server: Server;
  const settings = { login: 'alice', webId: 'http://test.com/#alice', name: 'Alice Bob' };

  beforeAll(async(): Promise<void> => {
    const factory = await instantiateFromConfig(
      'urn:solid-server:default:ServerFactory', 'server-without-auth.json', {
        'urn:solid-server:default:variable:port': port,
        'urn:solid-server:default:variable:baseUrl': baseUrl,
      },
    ) as HttpServerFactory;
    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    await new Promise<void>((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
  });

  it('creates a pod when posting PodSettings to /pods.', async(): Promise<void> => {
    const pod = `${baseUrl}${settings.login}/`;

    // Pod should not exist yet
    let res = await fetch(pod);
    expect(res.status).toBe(404);

    // Create pod call should return the address of the new pod
    res = await fetch(`${baseUrl}pods`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(`${baseUrl}${settings.login}/`);

    // Check if all resources are created
    res = await fetch(`${pod}.acl`);
    expect(res.status).toBe(200);
    let body = await readableToString(res.body as any);
    expect(body).toContain(`acl:agent <${settings.webId}>`);

    res = await fetch(`${pod}profile/card`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/turtle');
    body = await readableToString(res.body as any);
    expect(body).toBe(`@prefix foaf: <http://xmlns.com/foaf/0.1/>.

<${settings.webId}>
    a foaf:Person ;
    foaf:name "${settings.name}".
`);
  });
});
