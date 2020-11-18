import type { Patch } from '../../../src/ldp/http/Patch';
import type { Representation } from '../../../src/ldp/representation/Representation';
import { MonitoringStore } from '../../../src/storage/MonitoringStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';

describe('A MonitoringStore', (): void => {
  let store: MonitoringStore;
  let source: ResourceStore;
  let changedCallback: () => void;

  beforeEach(async(): Promise<void> => {
    source = {
      getRepresentation: jest.fn(async(): Promise<any> => 'get'),
      addResource: jest.fn(async(): Promise<any> => ({ path: 'newResource' })),
      setRepresentation: jest.fn(async(): Promise<any> => undefined),
      deleteResource: jest.fn(async(): Promise<any> => undefined),
      modifyResource: jest.fn(async(): Promise<any> => undefined),
    };
    store = new MonitoringStore(source);
    changedCallback = jest.fn();
    store.on('changed', changedCallback);
  });

  afterEach(async(): Promise<void> => {
    store.removeListener('changed', changedCallback);
  });

  it('calls getRepresentation directly from the source.', async(): Promise<void> => {
    await expect(store.getRepresentation({ path: 'getPath' }, {})).resolves.toBe('get');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith({ path: 'getPath' }, {}, undefined);
  });

  it('does not fire a change event after completing getRepresentation.', async(): Promise<void> => {
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await store.getRepresentation({ path: 'getPath' }, {});
    expect(changedCallback).toHaveBeenCalledTimes(0);
  });

  it('calls addResource directly from the source.', async(): Promise<void> => {
    await expect(store.addResource({ path: 'addPath' }, {} as Representation)).resolves
      .toStrictEqual({ path: 'newResource' });
    expect(source.addResource).toHaveBeenCalledTimes(1);
    expect(source.addResource).toHaveBeenLastCalledWith({ path: 'addPath' }, {}, undefined);
  });

  it('fires a change event after completing addResource.', async(): Promise<void> => {
    const result = store.addResource({ path: 'addPath' }, {} as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'newResource' });
  });

  it('calls setRepresentation directly from the source.', async(): Promise<void> => {
    await expect(store.setRepresentation({ path: 'setPath' }, {} as Representation)).resolves.toBeUndefined();
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith({ path: 'setPath' }, {}, undefined);
  });

  it('fires a change event after completing setRepresentation.', async(): Promise<void> => {
    const result = store.setRepresentation({ path: 'setPath' }, {} as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'setPath' });
  });

  it('calls deleteResource directly from the source.', async(): Promise<void> => {
    await expect(store.deleteResource({ path: 'deletePath' })).resolves.toBeUndefined();
    expect(source.deleteResource).toHaveBeenCalledTimes(1);
    expect(source.deleteResource).toHaveBeenLastCalledWith({ path: 'deletePath' }, undefined);
  });

  it('fires a change event after completing deleteResource.', async(): Promise<void> => {
    const result = store.deleteResource({ path: 'deletePath' });
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
  });

  it('calls modifyResource directly from the source.', async(): Promise<void> => {
    await expect(store.modifyResource({ path: 'modifyPath' }, {} as Patch)).resolves.toBeUndefined();
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    expect(source.modifyResource).toHaveBeenLastCalledWith({ path: 'modifyPath' }, {}, undefined);
  });

  it('fires a change event after completing modifyResource.', async(): Promise<void> => {
    const result = store.modifyResource({ path: 'modifyPath' }, {} as Patch);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
  });
});
