import fetch from 'cross-fetch';
import { WebSocket } from 'ws';
import type { App } from '../../src/init/App';
import { getPort } from '../util/Util';
import { getDefaultVariables, getTestConfigPath, instantiateFromConfig } from './Config';

const port = getPort('LegacyWebSocketsProtocol');
const serverUrl = `http://localhost:${port}/`;
const headers = { forwarded: 'host=example.pod;proto=https' };

describe('A server with the Solid WebSockets API behind a proxy', (): void => {
  let app: App;

  beforeAll(async(): Promise<void> => {
    app = await instantiateFromConfig(
      'urn:solid-server:default:App',
      getTestConfigPath('legacy-websockets.json'),
      getDefaultVariables(port, 'https://example.pod/'),
    ) as App;

    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  it('returns a 404 if there is no data.', async(): Promise<void> => {
    const response = await fetch(`${serverUrl}foo`, { headers });
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
      client.on('message', (message: Buffer): any => messages.push(message.toString()));
      await new Promise((resolve): any => client.on('open', resolve));
    });

    afterEach((): void => {
      messages.length = 0;
    });

    afterAll((): void => {
      client.close();
    });

    it('sends the protocol version.', (): void => {
      expect(messages).toEqual([
        'protocol solid-0.1',
      ]);
    });

    describe('when the client subscribes to resources', (): void => {
      beforeAll(async(): Promise<void> => {
        client.send('sub https://example.pod/my-resource');
        client.send('sub https://example.pod/other-resource');
        client.send('sub https://example.pod/');
        await new Promise((resolve): any => client.once('message', resolve));
      });

      it('acknowledges the subscription.', async(): Promise<void> => {
        expect(messages).toEqual([
          'ack https://example.pod/my-resource',
          'ack https://example.pod/other-resource',
          'ack https://example.pod/',
        ]);
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
        expect(messages).toEqual([
          'pub https://example.pod/',
          'pub https://example.pod/my-resource',
        ]);
      });
    });
  });
});
