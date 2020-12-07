import { ServerInitializer } from '../../../src/init/ServerInitializer';
import type { HttpServerFactory } from '../../../src/server/HttpServerFactory';

describe('ServerInitializer', (): void => {
  const serverFactory: jest.Mocked<HttpServerFactory> = {
    startServer: jest.fn(),
  };

  let initializer: ServerInitializer;
  beforeAll(async(): Promise<void> => {
    initializer = new ServerInitializer(serverFactory, 3000);
  });

  it('starts an HTTP server.', async(): Promise<void> => {
    await initializer.handle();
    expect(serverFactory.startServer).toHaveBeenCalledWith(3000);
  });
});
