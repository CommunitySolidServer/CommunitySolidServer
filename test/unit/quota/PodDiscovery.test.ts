import type { DataAccessor } from '../../../src/storage/accessors/DataAccessor';
import { discoverPod } from '../../../src/storage/quota/PodDiscovery';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import type { IdentifierStrategy } from '../../../src/util/identifiers/IdentifierStrategy';

const PIM_STORAGE = 'http://www.w3.org/ns/pim/space#Storage';

function storageMetadata(isStorage: boolean): any {
  return {
    getAll: (): any[] => isStorage ? [{ value: PIM_STORAGE }] : [],
  };
}

function createStrategy(isRoot: () => boolean, parent: (identifier: any) => any): IdentifierStrategy {
  return {
    isRootContainer: jest.fn(isRoot),
    getParentContainer: jest.fn(parent),
  } as any;
}

describe('discoverPod', (): void => {
  let accessor: jest.Mocked<DataAccessor>;

  beforeEach((): void => {
    accessor = {
      canHandle: jest.fn(),
      getData: jest.fn(),
      getMetadata: jest.fn(),
      getChildren: jest.fn(),
      writeContainer: jest.fn(),
      writeDocument: jest.fn(),
      writeMetadata: jest.fn(),
      deleteResource: jest.fn(),
    };
  });

  it('returns the identifier when its metadata declares pim:Storage.', async(): Promise<void> => {
    const identifier = { path: 'http://example.com/alice/' };
    accessor.getMetadata.mockResolvedValue(storageMetadata(true));
    const strategy = createStrategy((): boolean => false, jest.fn());
    await expect(discoverPod(identifier, accessor, strategy)).resolves.toEqual(identifier);
  });

  it('walks up to a parent container that declares pim:Storage.', async(): Promise<void> => {
    const child = { path: 'http://example.com/alice/foo' };
    const pod = { path: 'http://example.com/alice/' };
    accessor.getMetadata
      .mockResolvedValueOnce(storageMetadata(false))
      .mockResolvedValueOnce(storageMetadata(true));
    const strategy = createStrategy((): boolean => false, (): any => pod);
    await expect(discoverPod(child, accessor, strategy)).resolves.toEqual(pod);
  });

  it('returns null when there is no pim:Storage and the container is a root container.', async(): Promise<void> => {
    const identifier = { path: 'http://example.com/' };
    accessor.getMetadata.mockResolvedValue(storageMetadata(false));
    const strategy = createStrategy((): boolean => true, jest.fn());
    await expect(discoverPod(identifier, accessor, strategy)).resolves.toBeNull();
  });

  it('walks up on a NotFoundHttpError from a non-root container.', async(): Promise<void> => {
    const child = { path: 'http://example.com/alice/foo' };
    const pod = { path: 'http://example.com/alice/' };
    accessor.getMetadata
      .mockRejectedValueOnce(new NotFoundHttpError())
      .mockResolvedValueOnce(storageMetadata(true));
    const strategy = createStrategy((): boolean => false, (): any => pod);
    await expect(discoverPod(child, accessor, strategy)).resolves.toEqual(pod);
  });

  it('returns null on a NotFoundHttpError at a root container.', async(): Promise<void> => {
    const identifier = { path: 'http://example.com/' };
    accessor.getMetadata.mockRejectedValue(new NotFoundHttpError());
    const strategy = createStrategy((): boolean => true, jest.fn());
    await expect(discoverPod(identifier, accessor, strategy)).resolves.toBeNull();
  });

  it('rethrows errors that are not NotFoundHttpError.', async(): Promise<void> => {
    const identifier = { path: 'http://example.com/alice/' };
    accessor.getMetadata.mockRejectedValue(new Error('boom'));
    const strategy = createStrategy((): boolean => false, jest.fn());
    await expect(discoverPod(identifier, accessor, strategy)).rejects.toThrow('boom');
  });
});
