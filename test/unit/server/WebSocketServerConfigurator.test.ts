import { EventEmitter } from 'events';
import type { Server } from 'http';
import type { WebSocket } from 'ws';
import type { Logger } from '../../../src/logging/Logger';
import { getLoggerFor } from '../../../src/logging/LogUtil';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import { WebSocketServerConfigurator } from '../../../src/server/WebSocketServerConfigurator';
import { flushPromises } from '../../util/Util';

jest.mock('ws', (): any => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  WebSocketServer: jest.fn().mockImplementation((): any => ({
    handleUpgrade(upgradeRequest: any, socket: any, head: any, callback: any): void {
      callback(socket, upgradeRequest);
    },
  })),
}));

jest.mock('../../../src/logging/LogUtil', (): any => {
  const logger: Logger =
    { error: jest.fn(), info: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

class SimpleWebSocketConfigurator extends WebSocketServerConfigurator {
  public async handleConnection(): Promise<void> {
    // Will be overwritten
  }
}

describe('A WebSocketServerConfigurator', (): void => {
  const logger: jest.Mocked<Logger> = getLoggerFor('mock') as any;
  let server: Server;
  let webSocket: WebSocket;
  let upgradeRequest: HttpRequest;
  let listener: jest.Mocked<SimpleWebSocketConfigurator>;

  beforeEach(async(): Promise<void> => {
    // Clearing the logger mock
    jest.clearAllMocks();
    server = new EventEmitter() as any;
    webSocket = new EventEmitter() as any;
    webSocket.send = jest.fn();
    webSocket.close = jest.fn();

    upgradeRequest = { url: `/foo` } as any;

    listener = new SimpleWebSocketConfigurator() as any;
    listener.handleConnection = jest.fn().mockResolvedValue('');
    await listener.handle(server);
  });

  it('attaches an upgrade listener to any server it gets.', async(): Promise<void> => {
    server = new EventEmitter() as any;
    expect(server.listenerCount('upgrade')).toBe(0);
    await listener.handle(server);
    expect(server.listenerCount('upgrade')).toBe(1);
  });

  it('calls the handleConnection function when there is a new WebSocket.', async(): Promise<void> => {
    server.emit('upgrade', upgradeRequest, webSocket);

    await flushPromises();

    expect(listener.handleConnection).toHaveBeenCalledTimes(1);
    expect(listener.handleConnection).toHaveBeenLastCalledWith(webSocket, upgradeRequest);
    expect(logger.error).toHaveBeenCalledTimes(0);
  });

  it('logs an error if something went wrong handling the connection.', async(): Promise<void> => {
    listener.handleConnection.mockRejectedValue(new Error('bad input'));
    server.emit('upgrade', upgradeRequest, webSocket);

    await flushPromises();

    expect(listener.handleConnection).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith('Something went wrong handling a WebSocket connection: bad input');
  });
});
