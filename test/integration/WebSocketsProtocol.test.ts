import type { Server } from 'http';
import fetch from 'cross-fetch';
import WebSocket from 'ws';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { instantiateFromConfig } from '../configs/Util';

const port = 6001;
const baseUrl = `http://localhost:${port}/`;

describe('A server with the Solid WebSockets API', (): void => {
  let server: Server;

  beforeAll(async(): Promise<void> => {
    const factory = await instantiateFromConfig(
      'urn:solid-server:default:ServerFactory', 'websockets.json', {
        'urn:solid-server:default:variable:port': port,
        'urn:solid-server:default:variable:base': baseUrl,
      },
    ) as HttpServerFactory;
    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    await new Promise((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
  });

  it('returns a 200.', async(): Promise<void> => {
    const response = await fetch(baseUrl);
    expect(response.status).toBe(200);
  });

  it('sets the Updates-Via header.', async(): Promise<void> => {
    const response = await fetch(baseUrl);
    expect(response.headers.get('Updates-Via')).toBe(`ws://localhost:${port}`);
  });

  describe('when a WebSocket client connects', (): void => {
    let client: WebSocket;
    const messages = new Array<string>();

    beforeAll(async(): Promise<void> => {
      client = new WebSocket(`ws://localhost:${port}`, [ 'solid/0.1.0-alpha' ]);
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
        'protocol solid/0.1.0-alpha',
        'warning Unstandardized protocol version, proceed with care',
      ]);
    });

    describe('when the client subscribes to a resource', (): void => {
      beforeAll(async(): Promise<void> => {
        client.send(`sub ${baseUrl}my-resource`);
        await new Promise((resolve): any => client.once('message', resolve));
      });

      it('acknowledges the subscription.', async(): Promise<void> => {
        expect(messages).toEqual([ `ack ${baseUrl}my-resource` ]);
      });

      it('notifies the client of resource updates.', async(): Promise<void> => {
        await fetch(`${baseUrl}my-resource`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        });
        expect(messages).toEqual([ `pub ${baseUrl}my-resource` ]);
      });
    });
  });
});
