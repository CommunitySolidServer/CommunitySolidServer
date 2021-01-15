import type { AclManager } from '../../../src/authorization/AclManager';
import { AclInitializer } from '../../../src/init/AclInitializer';
import { BasicRepresentation } from '../../../src/ldp/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';

jest.mock('../../../src/ldp/representation/BasicRepresentation');

// eslint-disable-next-line @typescript-eslint/naming-convention
const RepresentationMock: jest.Mock<BasicRepresentation> = BasicRepresentation as any;

describe('AclInitializer', (): void => {
  const store: jest.Mocked<ResourceStore> = {
    getRepresentation: jest.fn().mockRejectedValue(new NotFoundHttpError()),
    setRepresentation: jest.fn(),
  } as any;
  const aclManager: jest.Mocked<AclManager> = {
    getAclDocument: jest.fn(async(): Promise<ResourceIdentifier> => ({ path: 'http://test.com/.acl' })),
  } as any;
  const baseUrl = 'http://localhost:3000/';

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it('sets the default ACL when none exists already.', async(): Promise<void> => {
    const initializer = new AclInitializer({ baseUrl, store, aclManager });
    await initializer.handle();

    expect(aclManager.getAclDocument).toHaveBeenCalledWith({ path: 'http://localhost:3000/' });
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenCalledWith({ path: 'http://test.com/.acl' }, {});
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenCalledWith(
      { path: 'http://test.com/.acl' }, RepresentationMock.mock.instances[0],
    );
    expect(RepresentationMock).toHaveBeenCalledWith(
      expect.stringMatching('<#authorization>'), { path: 'http://test.com/.acl' }, 'text/turtle',
    );
  });

  it('sets the specific ACL when one was specified.', async(): Promise<void> => {
    const initializer = new AclInitializer({ baseUrl, store, aclManager, aclPath: __filename });
    await initializer.handle();

    expect(aclManager.getAclDocument).toHaveBeenCalledWith({ path: 'http://localhost:3000/' });
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenCalledWith({ path: 'http://test.com/.acl' }, {});
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenCalledWith(
      { path: 'http://test.com/.acl' }, RepresentationMock.mock.instances[0],
    );
    expect(RepresentationMock).toHaveBeenCalledWith(
      expect.stringMatching('Joachim'), { path: 'http://test.com/.acl' }, 'text/turtle',
    );
  });

  it('does not invoke ACL initialization when a root ACL already exists.', async(): Promise<void> => {
    store.getRepresentation.mockReturnValueOnce(Promise.resolve({
      data: { destroy: jest.fn() },
    } as any));

    const initializer = new AclInitializer({ baseUrl, store, aclManager });
    await initializer.handle();

    expect(aclManager.getAclDocument).toHaveBeenCalledWith({ path: 'http://localhost:3000/' });
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenCalledWith({ path: 'http://test.com/.acl' }, {});
    expect(store.setRepresentation).toHaveBeenCalledTimes(0);
  });

  it('errors when the root ACL check errors.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValueOnce(new Error('Fatal'));

    const initializer = new AclInitializer({ baseUrl, store, aclManager });
    await expect(initializer.handle()).rejects.toThrow('Fatal');
  });
});
