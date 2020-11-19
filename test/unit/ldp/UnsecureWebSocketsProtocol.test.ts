import { EventEmitter } from 'events';
import { UnsecureWebSocketsProtocol } from '../../../src/ldp/UnsecureWebSocketsProtocol';
import type { HttpRequest } from '../../../src/server/HttpRequest';

class DummySocket extends EventEmitter {
  public readonly messages = new Array<string>();
  public readonly close = jest.fn();

  public send(message: string): void {
    this.messages.push(message);
  }
}

describe('An UnsecureWebSocketsProtocol', (): void => {
  const source = new EventEmitter();
  const protocol = new UnsecureWebSocketsProtocol(source);

  describe('after registering a socket', (): void => {
    const webSocket = new DummySocket();

    beforeAll(async(): Promise<void> => {
      const upgradeRequest = {
        headers: {
          host: 'mypod.example',
          'sec-websocket-protocol': 'solid/0.1.0-alpha, other/1.0.0',
        },
        socket: {
          secure: true,
        },
      } as any as HttpRequest;
      await protocol.handle({ webSocket, upgradeRequest } as any);
    });

    afterEach((): void => {
      webSocket.messages.length = 0;
    });

    it('sends a protocol message.', (): void => {
      expect(webSocket.messages).toHaveLength(2);
      expect(webSocket.messages.shift()).toBe('protocol solid/0.1.0-alpha');
      expect(webSocket.messages.shift()).toBe('warning Unstandardized protocol version, proceed with care');
    });

    it('warns when receiving an unexpected message.', (): void => {
      webSocket.emit('message', 'unexpected');
      expect(webSocket.messages).toHaveLength(1);
      expect(webSocket.messages.shift()).toBe('warning Unrecognized message format: unexpected');
    });

    it('warns when receiving an unexpected message type.', (): void => {
      webSocket.emit('message', 'unknown 1 2 3');
      expect(webSocket.messages).toHaveLength(1);
      expect(webSocket.messages.shift()).toBe('warning Unrecognized message type: unknown');
    });

    describe('before subscribing to resources', (): void => {
      it('does not emit pub messages.', (): void => {
        source.emit('changed', { path: 'https://mypod.example/foo/bar' });
        expect(webSocket.messages).toHaveLength(0);
      });
    });

    describe('after subscribing to a resource', (): void => {
      beforeAll((): void => {
        webSocket.emit('message', 'sub https://mypod.example/foo/bar');
      });

      it('sends an ack message.', (): void => {
        expect(webSocket.messages).toHaveLength(1);
        expect(webSocket.messages.shift()).toBe('ack https://mypod.example/foo/bar');
      });

      it('emits pub messages for that resource.', (): void => {
        source.emit('changed', { path: 'https://mypod.example/foo/bar' });
        expect(webSocket.messages).toHaveLength(1);
        expect(webSocket.messages.shift()).toBe('pub https://mypod.example/foo/bar');
      });
    });

    describe('after subscribing to a resource via a relative URL', (): void => {
      beforeAll((): void => {
        webSocket.emit('message', 'sub /relative/foo');
      });

      it('sends an ack message.', (): void => {
        expect(webSocket.messages).toHaveLength(1);
        expect(webSocket.messages.shift()).toBe('ack https://mypod.example/relative/foo');
      });

      it('emits pub messages for that resource.', (): void => {
        source.emit('changed', { path: 'https://mypod.example/relative/foo' });
        expect(webSocket.messages).toHaveLength(1);
        expect(webSocket.messages.shift()).toBe('pub https://mypod.example/relative/foo');
      });
    });

    describe('after subscribing to a resource with the wrong host name', (): void => {
      beforeAll((): void => {
        webSocket.emit('message', 'sub https://wrong.example/host/foo');
      });

      it('send an error message.', (): void => {
        expect(webSocket.messages).toHaveLength(1);
        expect(webSocket.messages.shift())
          .toBe('error Mismatched host: wrong.example instead of mypod.example');
      });
    });

    describe('after subscribing to a resource with the wrong protocol', (): void => {
      beforeAll((): void => {
        webSocket.emit('message', 'sub http://mypod.example/protocol/foo');
      });

      it('send an error message.', (): void => {
        expect(webSocket.messages).toHaveLength(1);
        expect(webSocket.messages.shift())
          .toBe('error Mismatched protocol: http: instead of https:');
      });
    });
  });

  it('unsubscribes when a socket closes.', async(): Promise<void> => {
    const newSocket = new DummySocket();
    await protocol.handle({ webSocket: newSocket, upgradeRequest: { headers: {}, socket: {}}} as any);
    expect(newSocket.listenerCount('message')).toBe(1);
    newSocket.emit('close');
    expect(newSocket.listenerCount('message')).toBe(0);
    expect(newSocket.listenerCount('close')).toBe(0);
    expect(newSocket.listenerCount('error')).toBe(0);
  });

  it('unsubscribes when a socket errors.', async(): Promise<void> => {
    const newSocket = new DummySocket();
    await protocol.handle({ webSocket: newSocket, upgradeRequest: { headers: {}, socket: {}}} as any);
    expect(newSocket.listenerCount('message')).toBe(1);
    newSocket.emit('error');
    expect(newSocket.listenerCount('message')).toBe(0);
    expect(newSocket.listenerCount('close')).toBe(0);
    expect(newSocket.listenerCount('error')).toBe(0);
  });

  it('emits a warning when no Sec-WebSocket-Protocol is supplied.', async(): Promise<void> => {
    const newSocket = new DummySocket();
    const upgradeRequest = {
      headers: {},
      socket: {},
    } as any as HttpRequest;
    await protocol.handle({ webSocket: newSocket, upgradeRequest } as any);
    expect(newSocket.messages).toHaveLength(3);
    expect(newSocket.messages.pop())
      .toBe('warning Missing Sec-WebSocket-Protocol header, expected value \'solid/0.1.0-alpha\'');
    expect(newSocket.close).toHaveBeenCalledTimes(0);
  });

  it('emits an error and closes the connection with the wrong Sec-WebSocket-Protocol.', async(): Promise<void> => {
    const newSocket = new DummySocket();
    const upgradeRequest = {
      headers: {
        'sec-websocket-protocol': 'solid/1.0.0, other',
      },
      socket: {},
    } as any as HttpRequest;
    await protocol.handle({ webSocket: newSocket, upgradeRequest } as any);
    expect(newSocket.messages).toHaveLength(3);
    expect(newSocket.messages.pop()).toBe('error Client does not support protocol solid/0.1.0-alpha');
    expect(newSocket.close).toHaveBeenCalledTimes(1);
    expect(newSocket.listenerCount('message')).toBe(0);
    expect(newSocket.listenerCount('close')).toBe(0);
    expect(newSocket.listenerCount('error')).toBe(0);
  });
});
