import { EventEmitter } from 'node:events';
import type { Server } from 'node:http';
import type { WebSocket } from 'ws';
import type { Logger } from '../../../src/logging/Logger';
import { getLoggerFor } from '../../../src/logging/LogUtil';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { WebSocketHandler } from '../../../src/server/WebSocketHandler';
import { WebSocketServerConfigurator } from '../../../src/server/WebSocketServerConfigurator';
import { flushPromises } from '../../util/Util';

jest.mock('ws', (): any => ({
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

describe('A WebSocketServerConfigurator', (): void => {
  const logger: jest.Mocked<Logger> = getLoggerFor('mock') as any;
  let server: Server;
  let webSocket: WebSocket;
  let upgradeRequest: HttpRequest;
  let handler: jest.Mocked<WebSocketHandler>;
  let configurator: WebSocketServerConfigurator;

  beforeEach(async(): Promise<void> => {
    // Clearing the logger mock
    jest.clearAllMocks();
    server = new EventEmitter() as any;
    webSocket = {
      send: jest.fn(),
      close: jest.fn(),
    } as any;

    upgradeRequest = new EventEmitter() as any;

    handler = {
      handleSafe: jest.fn(),
    } as any;

    configurator = new WebSocketServerConfigurator(handler);
    await configurator.handle(server);
  });

  it('attaches an upgrade listener to any server it gets.', async(): Promise<void> => {
    server = new EventEmitter() as any;
    expect(server.listenerCount('upgrade')).toBe(0);
    await configurator.handle(server);
    expect(server.listenerCount('upgrade')).toBe(1);
  });

  it('calls the handleConnection function when there is a new WebSocket.', async(): Promise<void> => {
    server.emit('upgrade', upgradeRequest, webSocket);

    await flushPromises();

    expect(handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(handler.handleSafe).toHaveBeenLastCalledWith({ webSocket, upgradeRequest });
    expect(logger.error).toHaveBeenCalledTimes(0);
  });

  it('logs an error if something went wrong handling the connection.', async(): Promise<void> => {
    handler.handleSafe.mockRejectedValue(new Error('bad input'));
    server.emit('upgrade', upgradeRequest, webSocket);

    await flushPromises();

    expect(handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith('Something went wrong handling a WebSocket connection: bad input');
    expect(webSocket.send).toHaveBeenCalledTimes(1);
    expect(webSocket.send).toHaveBeenLastCalledWith('There was an error opening this WebSocket: bad input');
    expect(webSocket.close).toHaveBeenCalledTimes(1);
  });
});
