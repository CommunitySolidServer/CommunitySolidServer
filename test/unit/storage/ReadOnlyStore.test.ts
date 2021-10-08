import type { Patch } from '../../../src/http/representation/Patch';
import type { Representation } from '../../../src/http/representation/Representation';
import { ReadOnlyStore } from '../../../src/storage/ReadOnlyStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';

describe('A ReadOnlyStore', (): void => {
  const source: jest.Mocked<ResourceStore> = {
    getRepresentation: jest.fn(async(): Promise<any> => 'get'),
    addResource: jest.fn(),
    setRepresentation: jest.fn(),
    deleteResource: jest.fn(),
    modifyResource: jest.fn(),
  } as any;
  let store: ReadOnlyStore;

  beforeAll((): void => {
    store = new ReadOnlyStore(source);
  });

  it('calls getRepresentation directly from the source.', async(): Promise<void> => {
    await expect(store.getRepresentation({ path: 'getPath' }, {})).resolves.toBe('get');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith({ path: 'getPath' }, {}, undefined);
  });

  it('throws an error when calling addResource.', async(): Promise<void> => {
    await expect(store.addResource({ path: 'addPath' }, {} as Representation))
      .rejects.toThrow(ForbiddenHttpError);
    expect(source.addResource).toHaveBeenCalledTimes(0);
  });

  it('throws an error when calling setRepresentation.', async(): Promise<void> => {
    await expect(store.setRepresentation({ path: 'setPath' }, {} as Representation))
      .rejects.toThrow(ForbiddenHttpError);
    expect(source.setRepresentation).toHaveBeenCalledTimes(0);
  });

  it('throws an error when calling deleteResource.', async(): Promise<void> => {
    await expect(store.deleteResource({ path: 'deletePath' }))
      .rejects.toThrow(ForbiddenHttpError);
    expect(source.deleteResource).toHaveBeenCalledTimes(0);
  });

  it('throws an error when calling modifyResource.', async(): Promise<void> => {
    await expect(store.modifyResource({ path: 'modifyPath' }, {} as Patch))
      .rejects.toThrow(ForbiddenHttpError);
    expect(source.modifyResource).toHaveBeenCalledTimes(0);
  });
});
