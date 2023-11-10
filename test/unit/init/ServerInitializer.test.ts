import type { Server } from 'node:http';
import { Server as HttpsServer } from 'node:https';
import { ServerInitializer } from '../../../src/init/ServerInitializer';
import type { Logger } from '../../../src/logging/Logger';
import { getLoggerFor } from '../../../src/logging/LogUtil';
import type { HttpServerFactory } from '../../../src/server/HttpServerFactory';

// Mock so we don't create an actual HTTPS server in the test below
jest.mock('node:https');
jest.mock('../../../src/logging/LogUtil');

describe('ServerInitializer', (): void => {
  let logger: jest.Mocked<Logger>;
  let server: Server;
  let serverFactory: jest.Mocked<HttpServerFactory>;
  let initializer: ServerInitializer;

  beforeEach(async(): Promise<void> => {
    logger = { info: jest.fn() } as any;
    (getLoggerFor as jest.MockedFn<() => Logger>).mockReturnValue(logger);

    server = {
      address: jest.fn().mockResolvedValue('address'),
      listen: jest.fn(),
      close: jest.fn((fn: () => void): void => fn()),
    } as any;
    serverFactory = {
      createServer: jest.fn().mockReturnValue(server),
    };
    initializer = new ServerInitializer(serverFactory, 3000);
  });

  it('starts an HTTP server.', async(): Promise<void> => {
    await initializer.handle();
    expect(serverFactory.createServer).toHaveBeenCalledTimes(1);
    expect(server.listen).toHaveBeenCalledTimes(1);
    expect(server.listen).toHaveBeenLastCalledWith(3000);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenLastCalledWith(`Listening to server at http://localhost:3000/`);
  });

  it('correctly logs the protocol in case of an HTTPS server.', async(): Promise<void> => {
    server = new HttpsServer();
    serverFactory.createServer.mockResolvedValue(server);
    await initializer.handle();
    expect(serverFactory.createServer).toHaveBeenCalledTimes(1);
    expect(server.listen).toHaveBeenCalledTimes(1);
    expect(server.listen).toHaveBeenLastCalledWith(3000);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenLastCalledWith(`Listening to server at https://localhost:3000/`);
  });

  it('listens to the specified Unix Domain Socket.', async(): Promise<void> => {
    initializer = new ServerInitializer(serverFactory, undefined, '/tmp/css.sock');
    await initializer.handle();
    expect(server.listen).toHaveBeenCalledWith('/tmp/css.sock');
  });

  it('throws when neither port or socket are set.', async(): Promise<void> => {
    expect((): void => {
      initializer = new ServerInitializer(serverFactory, undefined, undefined);
    }).toThrow('Either Port or Socket arguments must be set');
  });

  it('can stop the server.', async(): Promise<void> => {
    await initializer.handle();
    await expect(initializer.finalize()).resolves.toBeUndefined();
    expect(server.close).toHaveBeenCalledTimes(1);
  });

  it('only tries to stop the server if it was initialized.', async(): Promise<void> => {
    await expect(initializer.finalize()).resolves.toBeUndefined();
    expect(server.close).toHaveBeenCalledTimes(0);
  });
});
