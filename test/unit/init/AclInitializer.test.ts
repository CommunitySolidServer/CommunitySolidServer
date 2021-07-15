import fs from 'fs';
import { AclInitializer } from '../../../src/init/AclInitializer';
import type { AuxiliaryIdentifierStrategy } from '../../../src/ldp/auxiliary/AuxiliaryIdentifierStrategy';
import { BasicRepresentation } from '../../../src/ldp/representation/BasicRepresentation';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { InternalServerError } from '../../../src/util/errors/InternalServerError';
import { joinFilePath } from '../../../src/util/PathUtil';

const createReadStream = jest.spyOn(fs, 'createReadStream').mockReturnValue('file contents' as any);

jest.mock('../../../src/ldp/representation/BasicRepresentation');

// eslint-disable-next-line @typescript-eslint/naming-convention
const RepresentationMock: jest.Mock<BasicRepresentation> = BasicRepresentation as any;

describe('AclInitializer', (): void => {
  const store: jest.Mocked<ResourceStore> = {
    setRepresentation: jest.fn(),
    resourceExists: jest.fn().mockImplementation((): any => false),
  } as any;
  const aclIdentifier = { path: 'http://test.com/.acl' };
  const aclStrategy: jest.Mocked<AuxiliaryIdentifierStrategy> = {
    getAuxiliaryIdentifier: jest.fn().mockReturnValue(aclIdentifier),
  } as any;
  const baseUrl = 'http://localhost:3000/';

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it('sets the default ACL when none exists already.', async(): Promise<void> => {
    const initializer = new AclInitializer({ baseUrl, store, aclStrategy });
    await initializer.handle();

    expect(aclStrategy.getAuxiliaryIdentifier).toHaveBeenCalledWith({ path: baseUrl });
    expect(store.resourceExists).toHaveBeenCalledTimes(1);
    expect(store.resourceExists).toHaveBeenCalledWith(aclIdentifier);
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenCalledWith(
      { path: 'http://test.com/.acl' }, RepresentationMock.mock.instances[0],
    );
    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith(joinFilePath(__dirname, '../../../templates/root/.acl'), 'utf8');
    expect(RepresentationMock).toHaveBeenCalledWith('file contents', aclIdentifier, 'text/turtle');
  });

  it('sets the specific ACL when one was specified.', async(): Promise<void> => {
    const initializer = new AclInitializer({ baseUrl, store, aclStrategy, aclPath: '/path/doc.acl' });
    await initializer.handle();

    expect(aclStrategy.getAuxiliaryIdentifier).toHaveBeenCalledWith({ path: baseUrl });
    expect(store.resourceExists).toHaveBeenCalledTimes(1);
    expect(store.resourceExists).toHaveBeenCalledWith(aclIdentifier);
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenCalledWith(
      { path: 'http://test.com/.acl' }, RepresentationMock.mock.instances[0],
    );
    expect(createReadStream).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledWith('/path/doc.acl', 'utf8');
    expect(RepresentationMock).toHaveBeenCalledWith('file contents', aclIdentifier, 'text/turtle');
  });

  it('does not invoke ACL initialization when a root ACL already exists.', async(): Promise<void> => {
    store.resourceExists.mockResolvedValueOnce(true);

    const initializer = new AclInitializer({ baseUrl, store, aclStrategy });
    await initializer.handle();

    expect(aclStrategy.getAuxiliaryIdentifier).toHaveBeenCalledWith({ path: baseUrl });
    expect(store.resourceExists).toHaveBeenCalledTimes(1);
    expect(store.resourceExists).toHaveBeenCalledWith(aclIdentifier);
    expect(store.setRepresentation).toHaveBeenCalledTimes(0);
  });

  it('errors when the root ACL check errors.', async(): Promise<void> => {
    store.setRepresentation.mockRejectedValueOnce(new Error('Fatal'));

    const initializer = new AclInitializer({ baseUrl, store, aclStrategy });
    const prom = initializer.handle();
    await expect(prom).rejects.toThrow('There was an issue initializing the root .acl resource: Fatal');
    await expect(prom).rejects.toThrow(InternalServerError);
  });
});
