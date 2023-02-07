import { EventEmitter } from 'events';
import type { Server } from 'http';
import type { WebSocket } from 'ws';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import type {
  NotificationChannelStorage,
} from '../../../../../src/server/notifications/NotificationChannelStorage';
import type {
  WebSocket2021Handler,
} from '../../../../../src/server/notifications/WebSocketSubscription2021/WebSocket2021Handler';
import {
  WebSocket2021Listener,
} from '../../../../../src/server/notifications/WebSocketSubscription2021/WebSocket2021Listener';
import { flushPromises } from '../../../../util/Util';

jest.mock('ws', (): any => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  WebSocketServer: jest.fn().mockImplementation((): any => ({
    handleUpgrade(upgradeRequest: any, socket: any, head: any, callback: any): void {
      callback(socket, upgradeRequest);
    },
  })),
}));

describe('A WebSocket2021Listener', (): void => {
  const channel: NotificationChannel = {
    id: 'id',
    topic: 'http://example.com/foo',
    type: 'type',
    features: {},
    lastEmit: 0,
  };
  const auth = '123456';
  let server: Server;
  let webSocket: WebSocket;
  let upgradeRequest: HttpRequest;
  let storage: jest.Mocked<NotificationChannelStorage>;
  let handler: jest.Mocked<WebSocket2021Handler>;
  const route = new AbsolutePathInteractionRoute('http://example.com/foo');
  let listener: WebSocket2021Listener;

  beforeEach(async(): Promise<void> => {
    server = new EventEmitter() as any;
    webSocket = new EventEmitter() as any;
    webSocket.send = jest.fn();
    webSocket.close = jest.fn();

    upgradeRequest = { url: `/foo?auth=${auth}` } as any;

    storage = {
      get: jest.fn().mockResolvedValue(channel),
    } as any;

    handler = {
      handleSafe: jest.fn(),
    } as any;

    listener = new WebSocket2021Listener(storage, handler, route);
    await listener.handle(server);
  });

  it('rejects request targeting an unknown path.', async(): Promise<void> => {
    upgradeRequest.url = '/wrong';
    server.emit('upgrade', upgradeRequest, webSocket);

    await flushPromises();

    expect(webSocket.send).toHaveBeenCalledTimes(1);
    expect(webSocket.send).toHaveBeenLastCalledWith('Unknown WebSocket target.');
    expect(webSocket.close).toHaveBeenCalledTimes(1);
    expect(handler.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('rejects request with no url.', async(): Promise<void> => {
    delete upgradeRequest.url;
    server.emit('upgrade', upgradeRequest, webSocket);

    await flushPromises();

    expect(webSocket.send).toHaveBeenCalledTimes(1);
    expect(webSocket.send).toHaveBeenLastCalledWith('Unknown WebSocket target.');
    expect(webSocket.close).toHaveBeenCalledTimes(1);
    expect(handler.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('rejects requests without an auth parameter.', async(): Promise<void> => {
    upgradeRequest.url = '/foo';
    server.emit('upgrade', upgradeRequest, webSocket);

    await flushPromises();

    expect(webSocket.send).toHaveBeenCalledTimes(1);
    expect(webSocket.send).toHaveBeenLastCalledWith('Missing auth parameter from WebSocket URL.');
    expect(webSocket.close).toHaveBeenCalledTimes(1);
    expect(handler.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('rejects requests with an unknown auth parameter.', async(): Promise<void> => {
    storage.get.mockResolvedValue(undefined);
    server.emit('upgrade', upgradeRequest, webSocket);

    await flushPromises();

    expect(webSocket.send).toHaveBeenCalledTimes(1);
    expect(webSocket.send).toHaveBeenLastCalledWith(`Notification channel has expired`);
    expect(webSocket.close).toHaveBeenCalledTimes(1);
    expect(handler.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('calls the handler when receiving a valid request.', async(): Promise<void> => {
    server.emit('upgrade', upgradeRequest, webSocket);

    await flushPromises();

    expect(webSocket.send).toHaveBeenCalledTimes(0);
    expect(webSocket.close).toHaveBeenCalledTimes(0);
    expect(handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(handler.handleSafe).toHaveBeenLastCalledWith({ webSocket, channel });
  });
});
