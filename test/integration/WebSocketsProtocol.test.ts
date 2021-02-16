import type { Server } from 'http';
import fetch from 'cross-fetch';
import WebSocket from 'ws';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { instantiateFromConfig } from './Config';

const port = 6001;
const serverUrl = `http://localhost:${port}/`;
const headers = { forwarded: 'host=example.pod;proto=https' };

describe('A server with the Solid WebSockets API behind a proxy', (): void => {
  let server: Server;

  beforeAll(async(): Promise<void> => {
    const factory = await instantiateFromConfig(
      'urn:solid-server:default:ServerFactory', 'server-without-auth.json', {
        'urn:solid-server:default:variable:port': port,
        'urn:solid-server:default:variable:baseUrl': 'https://example.pod/',
        'urn:solid-server:default:variable:podTemplateFolder': 'templates/pod',
      },
    ) as HttpServerFactory;
    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    await new Promise<void>((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
  });

  it('returns a 404 if no data was initialized.', async(): Promise<void> => {
    const response = await fetch(serverUrl, { headers });
    expect(response.status).toBe(404);
  });

  it('sets the Updates-Via header.', async(): Promise<void> => {
    const response = await fetch(serverUrl, { headers });
    expect(response.headers.get('Updates-Via')).toBe('wss://example.pod/');
  });

  it('exposes the Updates-Via header via CORS.', async(): Promise<void> => {
    const response = await fetch(serverUrl, { headers });
    expect(response.headers.get('Access-Control-Expose-Headers')!.split(','))
      .toContain('Updates-Via');
  });

  describe('when a WebSocket client connects', (): void => {
    let client: WebSocket;
    const messages = new Array<string>();

    beforeAll(async(): Promise<void> => {
      client = new WebSocket(`ws://localhost:${port}`, [ 'solid-0.1' ], { headers });
      client.on('message', (message: string): any => messages.push(message));
      await new Promise((resolve): any => client.on('open', resolve));
    });

    afterAll((): void => {
      client.close();
    });

    afterEach((): void => {
      messages.length = 0;
    });

    it('sends the protocol version.', (): void => {
      expect(messages).toEqual([
        'protocol solid-0.1',
      ]);
    });

    describe('when the client subscribes to a resource', (): void => {
      beforeAll(async(): Promise<void> => {
        client.send(`sub https://example.pod/my-resource`);
        await new Promise((resolve): any => client.once('message', resolve));
      });

      it('acknowledges the subscription.', async(): Promise<void> => {
        expect(messages).toEqual([ `ack https://example.pod/my-resource` ]);
      });

      it('notifies the client of resource updates.', async(): Promise<void> => {
        await fetch(`${serverUrl}my-resource`, {
          method: 'PUT',
          headers: {
            ...headers,
            'content-type': 'application/json',
          },
          body: '{}',
        });
        expect(messages).toEqual([ `pub https://example.pod/my-resource` ]);
      });
    });
  });
});
