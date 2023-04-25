import { EventEmitter } from 'events';
import type { Server } from 'http';
import type { WebSocket } from 'ws';

import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import type {
  NotificationChannelStorage,
} from '../../../../../src/server/notifications/NotificationChannelStorage';
import type {
  WebSocket2023Handler,
} from '../../../../../src/server/notifications/WebSocketChannel2023/WebSocket2023Handler';
import {
  WebSocket2023Listener,
} from '../../../../../src/server/notifications/WebSocketChannel2023/WebSocket2023Listener';
import { flushPromises } from '../../../../util/Util';

jest.mock('ws', (): any => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  WebSocketServer: jest.fn().mockImplementation((): any => ({
    handleUpgrade(upgradeRequest: any, socket: any, head: any, callback: any): void {
      callback(socket, upgradeRequest);
    },
  })),
}));

describe('A WebSocket2023Listener', (): void => {
  const channel: NotificationChannel = {
    id: 'id',
    topic: 'http://example.com/foo',
    type: 'type',
  };
  let server: Server;
  let webSocket: WebSocket;
  let upgradeRequest: HttpRequest;
  let storage: jest.Mocked<NotificationChannelStorage>;
  let handler: jest.Mocked<WebSocket2023Handler>;
  const baseUrl = 'http://example.com/';
  let listener: WebSocket2023Listener;

  beforeEach(async(): Promise<void> => {
    server = new EventEmitter() as any;
    webSocket = new EventEmitter() as any;
    webSocket.send = jest.fn();
    webSocket.close = jest.fn();

    upgradeRequest = { url: `/foo/123456` } as any;

    storage = {
      get: jest.fn().mockResolvedValue(channel),
    } as any;

    handler = {
      handleSafe: jest.fn(),
    } as any;

    listener = new WebSocket2023Listener(storage, handler, baseUrl);
    await listener.handle(server);
  });

  it('rejects requests with an unknown target.', async(): Promise<void> => {
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
