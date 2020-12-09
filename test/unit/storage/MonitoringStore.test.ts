import type { Patch } from '../../../src/ldp/http/Patch';
import type { Representation } from '../../../src/ldp/representation/Representation';
import { MonitoringStore } from '../../../src/storage/MonitoringStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';

describe('A MonitoringStore', (): void => {
  let store: MonitoringStore;
  let source: ResourceStore;
  const identifierStrategy = new SingleRootIdentifierStrategy('http://example.org/');
  let changedCallback: () => void;

  beforeEach(async(): Promise<void> => {
    source = {
      getRepresentation: jest.fn(async(): Promise<any> => ({ success: true })),
      addResource: jest.fn(async(): Promise<any> => ({ path: 'http://example.org/foo/bar/new' })),
      setRepresentation: jest.fn(async(): Promise<any> => undefined),
      deleteResource: jest.fn(async(): Promise<any> => undefined),
      modifyResource: jest.fn(async(): Promise<any> => undefined),
    };
    store = new MonitoringStore(source, identifierStrategy);
    changedCallback = jest.fn();
    store.on('changed', changedCallback);
  });

  afterEach(async(): Promise<void> => {
    store.removeListener('changed', changedCallback);
  });

  it('calls getRepresentation directly from the source.', async(): Promise<void> => {
    await expect(store.getRepresentation({ path: 'getPath' }, {})).resolves.toEqual({ success: true });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith({ path: 'getPath' }, {}, undefined);
  });

  it('does not fire a change event after completing getRepresentation.', async(): Promise<void> => {
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await store.getRepresentation({ path: 'http://example.org/foo/bar' }, {});
    expect(changedCallback).toHaveBeenCalledTimes(0);
  });

  it('calls addResource directly from the source.', async(): Promise<void> => {
    await expect(store.addResource({ path: 'http://example.org/foo/bar' }, {} as Representation)).resolves
      .toStrictEqual({ path: 'http://example.org/foo/bar/new' });
    expect(source.addResource).toHaveBeenCalledTimes(1);
    expect(source.addResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, {}, undefined);
  });

  it('fires resource and container change events after completing addResource.', async(): Promise<void> => {
    const result = store.addResource({ path: 'http://example.org/foo/bar' }, {} as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(2);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar' });
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' });
  });

  it('calls setRepresentation directly from the source.', async(): Promise<void> => {
    await expect(store.setRepresentation({ path: 'http://example.org/foo/bar' }, {} as Representation))
      .resolves.toBeUndefined();
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, {}, undefined);
  });

  it('fires a resource change event after completing setRepresentation.', async(): Promise<void> => {
    const result = store.setRepresentation({ path: 'http://example.org/foo/bar' }, {} as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar' });
  });

  it('calls deleteResource directly from the source.', async(): Promise<void> => {
    await expect(store.deleteResource({ path: 'http://example.org/foo/bar' })).resolves.toBeUndefined();
    expect(source.deleteResource).toHaveBeenCalledTimes(1);
    expect(source.deleteResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, undefined);
  });

  it('fires resource and container change events after completing deleteResource.', async(): Promise<void> => {
    const result = store.deleteResource({ path: 'http://example.org/foo/bar' });
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(2);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/' });
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar' });
  });

  it('fires a resource change event after completing deleteResource on the root.', async(): Promise<void> => {
    const result = store.deleteResource({ path: 'http://example.org/' });
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/' });
  });

  it('calls modifyResource directly from the source.', async(): Promise<void> => {
    await expect(store.modifyResource({ path: 'http://example.org/foo/bar' }, {} as Patch))
      .resolves.toBeUndefined();
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    expect(source.modifyResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, {}, undefined);
  });

  it('fires a resource change event after completing modifyResource.', async(): Promise<void> => {
    const result = store.modifyResource({ path: 'http://example.org/foo/bar' }, {} as Patch);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar' });
  });
});
