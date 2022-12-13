import type { Server } from 'http';
import { Server as HttpsServer } from 'https';
import { ServerInitializer } from '../../../src/init/ServerInitializer';
import type { Logger } from '../../../src/logging/Logger';
import { getLoggerFor } from '../../../src/logging/LogUtil';
import type { HttpServerFactory } from '../../../src/server/HttpServerFactory';

// Mock so we don't create an actual HTTPS server in the test below
jest.mock('https');
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
