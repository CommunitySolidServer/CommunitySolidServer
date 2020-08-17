import { Patch } from '../../../src/ldp/http/Patch';
import { PatchHandler } from '../../../src/storage/patch/PatchHandler';
import { PatchingStore } from '../../../src/storage/PatchingStore';
import { ResourceStore } from '../../../src/storage/ResourceStore';

describe('A PatchingStore', (): void => {
  let store: PatchingStore;
  let source: ResourceStore;
  let patcher: PatchHandler;
  let handleSafeFn: jest.Mock<Promise<void>, []>;

  beforeEach(async(): Promise<void> => {
    source = {
      modifyResource: jest.fn(async(): Promise<any> => 'modify'),
    } as unknown as ResourceStore;

    handleSafeFn = jest.fn(async(): Promise<any> => 'patcher');
    patcher = { handleSafe: handleSafeFn } as unknown as PatchHandler;

    store = new PatchingStore(source, patcher);
  });

  it('calls modifyResource directly from the source if available.', async(): Promise<void> => {
    await expect(store.modifyResource({ path: 'modifyPath' }, {} as Patch)).resolves.toBe('modify');
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    expect(source.modifyResource).toHaveBeenLastCalledWith({ path: 'modifyPath' }, {}, undefined);
  });

  it('calls its patcher if modifyResource failed.', async(): Promise<void> => {
    source.modifyResource = jest.fn(async(): Promise<any> => {
      throw new Error('dummy');
    });
    await expect(store.modifyResource({ path: 'modifyPath' }, {} as Patch)).resolves.toBe('patcher');
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    expect(source.modifyResource).toHaveBeenLastCalledWith({ path: 'modifyPath' }, {}, undefined);
    await expect((source.modifyResource as jest.Mock).mock.results[0].value).rejects.toThrow('dummy');
    expect(handleSafeFn).toHaveBeenCalledTimes(1);
    expect(handleSafeFn).toHaveBeenLastCalledWith({ identifier: { path: 'modifyPath' }, patch: {}});
  });
});
