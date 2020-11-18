import type { AclManager } from '../../../src/authorization/AclManager';
import { Setup } from '../../../src/init/Setup';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import { VoidLoggerFactory } from '../../../src/logging/VoidLoggerFactory';

describe('Setup', (): void => {
  let serverFactory: any;
  let store: any;
  let aclManager: AclManager;
  let setup: Setup;
  beforeEach(async(): Promise<void> => {
    store = {
      setRepresentation: jest.fn(async(): Promise<void> => undefined),
    };
    aclManager = {
      getAclDocument: jest.fn(async(): Promise<ResourceIdentifier> => ({ path: 'http://test.com/.acl' })),
    } as any;
    serverFactory = {
      startServer: jest.fn(),
    };
    setup = new Setup(serverFactory, store, aclManager, new VoidLoggerFactory(), 'http://localhost:3000/', 3000);
  });

  it('starts an HTTP server.', async(): Promise<void> => {
    await setup.setup();
    expect(serverFactory.startServer).toHaveBeenCalledWith(3000);
  });

  it('invokes ACL initialization.', async(): Promise<void> => {
    await setup.setup();
    expect(aclManager.getAclDocument).toHaveBeenCalledWith({ path: 'http://localhost:3000/' });
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
  });
});
