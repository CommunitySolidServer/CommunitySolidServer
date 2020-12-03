import type { AclManager } from '../../../src/authorization/AclManager';
import { Setup } from '../../../src/init/Setup';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import { VoidLoggerFactory } from '../../../src/logging/VoidLoggerFactory';
import type { HttpServerFactory } from '../../../src/server/HttpServerFactory';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';

describe('Setup', (): void => {
  const serverFactory: jest.Mocked<HttpServerFactory> = {
    startServer: jest.fn(),
  };
  const store: jest.Mocked<ResourceStore> = {
    getRepresentation: jest.fn().mockRejectedValue(new NotFoundHttpError()),
    setRepresentation: jest.fn(),
  } as any;
  const aclManager: jest.Mocked<AclManager> = {
    getAclDocument: jest.fn(async(): Promise<ResourceIdentifier> => ({ path: 'http://test.com/.acl' })),
  } as any;

  let setup: Setup;
  beforeEach(async(): Promise<void> => {
    setup = new Setup(serverFactory, store, aclManager, new VoidLoggerFactory(), 'http://localhost:3000/', 3000);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it('starts an HTTP server.', async(): Promise<void> => {
    await setup.setup();

    expect(serverFactory.startServer).toHaveBeenCalledWith(3000);
  });

  it('invokes ACL initialization.', async(): Promise<void> => {
    await setup.setup();

    expect(aclManager.getAclDocument).toHaveBeenCalledWith({ path: 'http://localhost:3000/' });
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenCalledWith({ path: 'http://test.com/.acl' }, {});
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
  });

  it('does not invoke ACL initialization when a root ACL already exists.', async(): Promise<void> => {
    store.getRepresentation.mockReturnValueOnce(Promise.resolve({
      data: { destroy: jest.fn() },
    } as any));

    await setup.setup();

    expect(aclManager.getAclDocument).toHaveBeenCalledWith({ path: 'http://localhost:3000/' });
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenCalledWith({ path: 'http://test.com/.acl' }, {});
    expect(store.setRepresentation).toHaveBeenCalledTimes(0);
  });

  it('errors when the root ACL check errors.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValueOnce(new Error('Fatal'));
    await expect(setup.setup()).rejects.toThrow('Fatal');
  });
});
