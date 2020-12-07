import type { Initializer } from '../../../src/init/Initializer';
import { Setup } from '../../../src/init/Setup';
import type { HttpServerFactory } from '../../../src/server/HttpServerFactory';

describe('Setup', (): void => {
  const serverFactory: jest.Mocked<HttpServerFactory> = {
    startServer: jest.fn(),
  };
  const initializer: jest.Mocked<Initializer> = {
    handleSafe: jest.fn(),
  } as any;

  beforeAll(async(): Promise<void> => {
    const setup = new Setup(initializer, serverFactory, 'http://localhost:3000/', 3000);
    await setup.setup();
  });

  it('starts an HTTP server.', async(): Promise<void> => {
    expect(serverFactory.startServer).toHaveBeenCalledWith(3000);
  });

  it('calls the initializer.', async(): Promise<void> => {
    expect(initializer.handleSafe).toHaveBeenCalledTimes(1);
  });
});
