import type { Patch } from '../../../src/http/representation/Patch';
import type { PatchHandler } from '../../../src/storage/patch/PatchHandler';
import { PatchingStore } from '../../../src/storage/PatchingStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';

describe('A PatchingStore', (): void => {
  let store: PatchingStore;
  let source: jest.Mocked<ResourceStore>;
  let patcher: PatchHandler;
  let handleSafeFn: jest.Mock<Promise<void>, []>;

  beforeEach(async(): Promise<void> => {
    source = {
      modifyResource: jest.fn(async(): Promise<any> => 'modify'),
    } satisfies Partial<ResourceStore> as any;

    handleSafeFn = jest.fn(async(): Promise<any> => 'patcher');
    patcher = { handleSafe: handleSafeFn } as unknown as PatchHandler;

    store = new PatchingStore(source, patcher);
  });

  it('calls modifyResource directly from the source if available.', async(): Promise<void> => {
    await expect(store.modifyResource({ path: 'modifyPath' }, {} as Patch)).resolves.toBe('modify');
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    expect(source.modifyResource).toHaveBeenLastCalledWith({ path: 'modifyPath' }, {}, undefined);
  });

  it('calls its patcher if modifyResource is not implemented.', async(): Promise<void> => {
    jest.spyOn(source, 'modifyResource').mockImplementation(async(): Promise<any> => {
      throw new NotImplementedHttpError();
    });
    await expect(store.modifyResource({ path: 'modifyPath' }, {} as Patch)).resolves.toBe('patcher');
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    expect(source.modifyResource).toHaveBeenLastCalledWith({ path: 'modifyPath' }, {}, undefined);
    await expect(source.modifyResource.mock.results[0].value).rejects.toThrow(NotImplementedHttpError);
    expect(handleSafeFn).toHaveBeenCalledTimes(1);
    expect(handleSafeFn).toHaveBeenLastCalledWith({ source, identifier: { path: 'modifyPath' }, patch: {}});
  });

  it('rethrows source modifyResource errors.', async(): Promise<void> => {
    jest.spyOn(source, 'modifyResource').mockImplementation(async(): Promise<any> => {
      throw new Error('dummy');
    });
    await expect(store.modifyResource({ path: 'modifyPath' }, {} as Patch)).rejects.toThrow('dummy');
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    expect(source.modifyResource).toHaveBeenLastCalledWith({ path: 'modifyPath' }, {}, undefined);
    expect(handleSafeFn).toHaveBeenCalledTimes(0);
  });
});
