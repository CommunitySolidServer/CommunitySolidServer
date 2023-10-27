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
import { NotImplementedHttpError } from '../../../../../src/util/errors/NotImplementedHttpError';

jest.mock('ws', (): any => ({
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
  let webSocket: WebSocket;
  let upgradeRequest: HttpRequest;
  let storage: jest.Mocked<NotificationChannelStorage>;
  let handler: jest.Mocked<WebSocket2023Handler>;
  const baseUrl = 'http://example.com/';
  let listener: WebSocket2023Listener;

  beforeEach(async(): Promise<void> => {
    webSocket = {
      send: jest.fn(),
      close: jest.fn(),
    } as any;

    upgradeRequest = { url: `/foo/123456` } as any;

    storage = {
      get: jest.fn().mockResolvedValue(channel),
    } as any;

    handler = {
      handleSafe: jest.fn(),
    } as any;

    listener = new WebSocket2023Listener(storage, handler, baseUrl);
  });

  it('rejects requests with an unknown target.', async(): Promise<void> => {
    await expect(listener.canHandle({ upgradeRequest, webSocket })).resolves.toBeUndefined();
    storage.get.mockResolvedValue(undefined);
    await expect(listener.canHandle({ upgradeRequest, webSocket })).rejects.toThrow(NotImplementedHttpError);
  });

  it('calls the handler when receiving a valid request.', async(): Promise<void> => {
    await expect(listener.handle({ upgradeRequest, webSocket })).resolves.toBeUndefined();
    expect(webSocket.send).toHaveBeenCalledTimes(0);
    expect(webSocket.close).toHaveBeenCalledTimes(0);
    expect(handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(handler.handleSafe).toHaveBeenLastCalledWith({ webSocket, channel });
  });
});
