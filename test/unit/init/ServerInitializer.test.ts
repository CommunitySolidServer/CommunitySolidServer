import type { Server } from 'http';
import { ServerInitializer } from '../../../src/init/ServerInitializer';
import type { HttpServerFactory } from '../../../src/server/HttpServerFactory';

describe('ServerInitializer', (): void => {
  let server: Server;
  let serverFactory: jest.Mocked<HttpServerFactory>;

  let initializer: ServerInitializer;
  beforeEach(async(): Promise<void> => {
    server = {
      close: jest.fn((fn: () => void): void => fn()),
    } as any;
    serverFactory = {
      startServer: jest.fn().mockReturnValue(server),
    };
    initializer = new ServerInitializer(serverFactory, 3000);
  });

  it('starts an HTTP server.', async(): Promise<void> => {
    await initializer.handle();
    expect(serverFactory.startServer).toHaveBeenCalledWith(3000);
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
