import fs from 'fs';
import type { AclManager } from '../../../src/authorization/AclManager';
import { AclInitializer } from '../../../src/init/AclInitializer';
import { BasicRepresentation } from '../../../src/ldp/representation/BasicRepresentation';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { joinFilePath } from '../../../src/util/PathUtil';

const createReadStream = jest.spyOn(fs, 'createReadStream').mockReturnValue('file contents' as any);

jest.mock('../../../src/ldp/representation/BasicRepresentation');

// eslint-disable-next-line @typescript-eslint/naming-convention
const RepresentationMock: jest.Mock<BasicRepresentation> = BasicRepresentation as any;

describe('AclInitializer', (): void => {
  const store: jest.Mocked<ResourceStore> = {
    getRepresentation: jest.fn().mockRejectedValue(new NotFoundHttpError()),
    setRepresentation: jest.fn(),
  } as any;
  const aclIdentifier = { path: 'http://test.com/.acl' };
  const aclManager: jest.Mocked<AclManager> = {
    getAclDocument: jest.fn().mockResolvedValue(aclIdentifier),
  } as any;
  const baseUrl = 'http://localhost:3000/';

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it('sets the default ACL when none exists already.', async(): Promise<void> => {
    const initializer = new AclInitializer({ baseUrl, store, aclManager });
    await initializer.handle();

    expect(aclManager.getAclDocument).toHaveBeenCalledWith({ path: baseUrl });
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenCalledWith(aclIdentifier, {});
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenCalledWith(
      { path: 'http://test.com/.acl' }, RepresentationMock.mock.instances[0],
    );
    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith(joinFilePath(__dirname, '../../../templates/root/.acl'), 'utf8');
    expect(RepresentationMock).toHaveBeenCalledWith('file contents', aclIdentifier, 'text/turtle');
  });

  it('sets the specific ACL when one was specified.', async(): Promise<void> => {
    const initializer = new AclInitializer({ baseUrl, store, aclManager, aclPath: '/path/doc.acl' });
    await initializer.handle();

    expect(aclManager.getAclDocument).toHaveBeenCalledWith({ path: baseUrl });
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenCalledWith(aclIdentifier, {});
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenCalledWith(
      { path: 'http://test.com/.acl' }, RepresentationMock.mock.instances[0],
    );
    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/path/doc.acl', 'utf8');
    expect(RepresentationMock).toHaveBeenCalledWith('file contents', aclIdentifier, 'text/turtle');
  });

  it('does not invoke ACL initialization when a root ACL already exists.', async(): Promise<void> => {
    store.getRepresentation.mockReturnValueOnce(Promise.resolve({
      data: { destroy: jest.fn() },
    } as any));

    const initializer = new AclInitializer({ baseUrl, store, aclManager });
    await initializer.handle();

    expect(aclManager.getAclDocument).toHaveBeenCalledWith({ path: baseUrl });
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenCalledWith(aclIdentifier, {});
    expect(store.setRepresentation).toHaveBeenCalledTimes(0);
  });

  it('errors when the root ACL check errors.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValueOnce(new Error('Fatal'));

    const initializer = new AclInitializer({ baseUrl, store, aclManager });
    await expect(initializer.handle()).rejects.toThrow('Fatal');
  });
});
