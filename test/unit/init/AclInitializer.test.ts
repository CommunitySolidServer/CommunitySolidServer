import type { AclManager } from '../../../src/authorization/AclManager';
import { AclInitializer } from '../../../src/init/AclInitializer';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';

describe('AclInitializer', (): void => {
  const store: jest.Mocked<ResourceStore> = {
    getRepresentation: jest.fn().mockRejectedValue(new NotFoundHttpError()),
    setRepresentation: jest.fn(),
  } as any;
  const aclManager: jest.Mocked<AclManager> = {
    getAclDocument: jest.fn(async(): Promise<ResourceIdentifier> => ({ path: 'http://test.com/.acl' })),
  } as any;
  const baseUrl = 'http://localhost:3000/';

  let initializer: AclInitializer;
  beforeEach(async(): Promise<void> => {
    initializer = new AclInitializer(baseUrl, store, aclManager);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it('invokes ACL initialization.', async(): Promise<void> => {
    await initializer.handle();

    expect(aclManager.getAclDocument).toHaveBeenCalledWith({ path: 'http://localhost:3000/' });
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenCalledWith({ path: 'http://test.com/.acl' }, {});
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
  });

  it('does not invoke ACL initialization when a root ACL already exists.', async(): Promise<void> => {
    store.getRepresentation.mockReturnValueOnce(Promise.resolve({
      data: { destroy: jest.fn() },
    } as any));

    await initializer.handle();

    expect(aclManager.getAclDocument).toHaveBeenCalledWith({ path: 'http://localhost:3000/' });
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenCalledWith({ path: 'http://test.com/.acl' }, {});
    expect(store.setRepresentation).toHaveBeenCalledTimes(0);
  });

  it('errors when the root ACL check errors.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValueOnce(new Error('Fatal'));
    await expect(initializer.handle()).rejects.toThrow('Fatal');
  });
});
