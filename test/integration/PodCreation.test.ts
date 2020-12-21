import type { Server } from 'http';
import { join } from 'path';
import fetch from 'cross-fetch';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { readableToString } from '../../src/util/StreamUtil';
import { instantiateFromConfig } from './Config';

const port = 6003;
const baseUrl = `http://localhost:${port}/`;

describe('A server with a pod handler', (): void => {
  let server: Server;
  const agent = { login: 'alice', webId: 'http://test.com/#alice', name: 'Alice Bob' };

  beforeAll(async(): Promise<void> => {
    const factory = await instantiateFromConfig(
      'urn:solid-server:default:ServerFactory', 'auth-allow-all.json', {
        'urn:solid-server:default:variable:port': port,
        'urn:solid-server:default:variable:baseUrl': baseUrl,
        'urn:solid-server:default:variable:podTemplateFolder': join(__dirname, '../assets/templates'),
      },
    ) as HttpServerFactory;
    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    await new Promise((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
  });

  it('creates a pod when posting an Agent to /pods.', async(): Promise<void> => {
    const pod = `${baseUrl}${agent.login}/`;

    // Pod should not exist yet
    let res = await fetch(pod);
    expect(res.status).toBe(404);

    // Create pod call should return the address of the new pod
    res = await fetch(`${baseUrl}pods`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(agent),
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(`${baseUrl}${agent.login}/`);

    // Check if all resources are created
    res = await fetch(`${pod}.acl`);
    expect(res.status).toBe(200);
    let body = await readableToString(res.body as any);
    expect(body).toBe(`@prefix acl: <http://www.w3.org/ns/auth/acl#>.

<#owner> acl:agent <${agent.webId}>.
`);

    res = await fetch(`${pod}profile/card`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/turtle');
    body = await readableToString(res.body as any);
    expect(body).toBe(`@prefix foaf: <http://xmlns.com/foaf/0.1/>.

<${agent.webId}>
    a foaf:Person ;
    foaf:name "${agent.name}".
`);
  });
});
