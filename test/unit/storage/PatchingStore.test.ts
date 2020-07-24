import { Patch } from '../../../src/ldp/http/Patch';
import { PatchHandler } from '../../../src/storage/patch/PatchHandler';
import { PatchingStore } from '../../../src/storage/PatchingStore';
import { Representation } from '../../../src/ldp/representation/Representation';
import { ResourceStore } from '../../../src/storage/ResourceStore';

describe('A PatchingStore', (): void => {
  let store: PatchingStore;
  let source: ResourceStore;
  let patcher: PatchHandler;
  let handleSafeFn: jest.Mock<Promise<void>, []>;

  beforeEach(async(): Promise<void> => {
    source = {
      getRepresentation: jest.fn(async(): Promise<any> => 'get'),
      addResource: jest.fn(async(): Promise<any> => 'add'),
      setRepresentation: jest.fn(async(): Promise<any> => 'set'),
      deleteResource: jest.fn(async(): Promise<any> => 'delete'),
      modifyResource: jest.fn(async(): Promise<any> => 'modify'),
    };

    handleSafeFn = jest.fn(async(): Promise<any> => 'patcher');
    patcher = { handleSafe: handleSafeFn } as unknown as PatchHandler;

    store = new PatchingStore(source, patcher);
  });

  it('calls getRepresentation directly from the source.', async(): Promise<void> => {
    await expect(store.getRepresentation({ path: 'getPath' }, {})).resolves.toBe('get');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith({ path: 'getPath' }, {}, undefined);
  });

  it('calls addResource directly from the source.', async(): Promise<void> => {
    await expect(store.addResource({ path: 'addPath' }, {} as Representation)).resolves.toBe('add');
    expect(source.addResource).toHaveBeenCalledTimes(1);
    expect(source.addResource).toHaveBeenLastCalledWith({ path: 'addPath' }, {}, undefined);
  });

  it('calls setRepresentation directly from the source.', async(): Promise<void> => {
    await expect(store.setRepresentation({ path: 'setPath' }, {} as Representation)).resolves.toBe('set');
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith({ path: 'setPath' }, {}, undefined);
  });

  it('calls deleteResource directly from the source.', async(): Promise<void> => {
    await expect(store.deleteResource({ path: 'deletePath' })).resolves.toBe('delete');
    expect(source.deleteResource).toHaveBeenCalledTimes(1);
    expect(source.deleteResource).toHaveBeenLastCalledWith({ path: 'deletePath' }, undefined);
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
