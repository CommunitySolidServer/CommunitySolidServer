import { Setup } from '../../../src/init/Setup';

describe('Setup', (): void => {
  let httpServer: any;
  let store: any;
  let aclManager: any;
  let setup: Setup;
  beforeEach(async(): Promise<void> => {
    store = {
      setRepresentation: jest.fn(async(): Promise<void> => undefined),
    };
    aclManager = {
      getAcl: jest.fn(async(): Promise<void> => undefined),
    };
    httpServer = {
      listen: jest.fn(),
    };
    setup = new Setup(httpServer, store, aclManager, 'http://localhost:3000/', 3000);
  });

  it('starts an HTTP server.', async(): Promise<void> => {
    await setup.setup();
    expect(httpServer.listen).toHaveBeenCalledWith(3000);
  });

  it('invokes ACL initialization.', async(): Promise<void> => {
    await setup.setup();
    expect(aclManager.getAcl).toHaveBeenCalledWith({ path: 'http://localhost:3000/' });
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
  });
});
