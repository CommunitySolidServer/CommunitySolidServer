import type { Patch } from '../../../src/http/representation/Patch';
import type { Representation } from '../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import { MonitoringStore } from '../../../src/storage/MonitoringStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { AS, SOLID_AS } from '../../../src/util/Vocabularies';

describe('A MonitoringStore', (): void => {
  let store: MonitoringStore;
  let source: jest.Mocked<any>;
  let changedCallback: () => void;
  const modified = [
    { path: 'http://example.org/modified/1' },
    { path: 'http://example.org/modified/2' },
  ];

  beforeEach(async(): Promise<void> => {
    source = {
      getRepresentation: jest.fn(async(): Promise<any> => ({ success: true })),
      addResource: jest.fn(),
      setRepresentation: jest.fn(async(): Promise<any> => modified),
      deleteResource: jest.fn(async(): Promise<any> => modified),
      modifyResource: jest.fn(async(): Promise<any> => modified),
      resourceExists: jest.fn(async(): Promise<any> => undefined),
    };
    store = new MonitoringStore(source);
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

  it('does not fire a change event after getRepresentation.', async(): Promise<void> => {
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await store.getRepresentation({ path: 'http://example.org/foo/bar' }, {});
    expect(changedCallback).toHaveBeenCalledTimes(0);
  });

  it('calls addResource directly from the source.', async(): Promise<void> => {
    source.addResource.mockReturnValue([
      new RepresentationMetadata('http://example.org/foo/bar').add(SOLID_AS.Activity, AS.Create),
    ]);

    const result = await store.addResource({ path: 'http://example.org/foo/bar' }, {} as Representation);
    expect(result).toHaveLength(1);
    expect(source.addResource).toHaveBeenCalledTimes(1);
    expect(source.addResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, {} as Representation, undefined);
  });

  it('fires an event containing metadata about container and resource changes after addResource.', async(): Promise<void> => {
    const mockReturnValue = [
      new RepresentationMetadata('http://example.org/foo/bar/').add(SOLID_AS.Activity, AS.Update),
      new RepresentationMetadata('http://example.org/foo/bar/new').add(SOLID_AS.Activity, AS.Create)
    ];
    source.addResource.mockReturnValue(mockReturnValue);

    const result = store.addResource({ path: 'http://example.org/foo/bar/new' }, {} as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith(mockReturnValue);
  });

  it('calls setRepresentation directly from the source.', async(): Promise<void> => {
    await expect(store.setRepresentation({ path: 'http://example.org/foo/bar' }, {} as Representation))
      .resolves.toEqual(modified);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, {}, undefined);
  });

  it('fires an event containing metadata about all changes after setRepresentation.', async(): Promise<void> => {
    const mockReturnValue = [
      new RepresentationMetadata('http://example.org/foo/bar/').add(SOLID_AS.Activity, AS.Update),
      new RepresentationMetadata('http://example.org/foo/bar/new').add(SOLID_AS.Activity, AS.Create)
    ];
    source.setRepresentation.mockReturnValue(mockReturnValue);

    const result = store.setRepresentation({ path: 'http://example.org/foo/bar' }, {} as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith(mockReturnValue);
  });

  it('calls deleteResource directly from the source.', async(): Promise<void> => {
    await expect(store.deleteResource({ path: 'http://example.org/foo/bar' }))
      .resolves.toEqual(modified);
    expect(source.deleteResource).toHaveBeenCalledTimes(1);
    expect(source.deleteResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, undefined);
  });

  it('fires an event containing metadata about all changes after deleteResource.', async(): Promise<void> => {
    const mockReturnValue = [
      new RepresentationMetadata('http://example.org/foo/bar/').add(SOLID_AS.Activity, AS.Update),
      new RepresentationMetadata('http://example.org/foo/bar/new').add(SOLID_AS.Activity, AS.Delete)
    ];
    source.deleteResource.mockReturnValue(mockReturnValue);

    const result = store.deleteResource({ path: 'http://example.org/foo/bar' });
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith(mockReturnValue);
  });

  it('calls modifyResource directly from the source.', async(): Promise<void> => {
    const mockReturnValue = [
      new RepresentationMetadata('http://example.org/foo/bar/').add(SOLID_AS.Activity, AS.Update),
      new RepresentationMetadata('http://example.org/foo/bar/new').add(SOLID_AS.Activity, AS.Delete)
    ];
    source.modifyResource.mockReturnValue(mockReturnValue);

    await store.modifyResource({ path: 'http://example.org/foo/bar' }, {} as Patch);
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith(mockReturnValue);
  });

  it('fires all modified change events after modifyResource.', async(): Promise<void> => {
    const mockReturnValue = [
      new RepresentationMetadata('http://example.org/foo/bar/').add(SOLID_AS.Activity, AS.Update),
      new RepresentationMetadata('http://example.org/foo/bar/new').add(SOLID_AS.Activity, AS.Delete)
    ];
    source.modifyResource.mockReturnValue(mockReturnValue);

    const result = store.modifyResource({ path: 'http://example.org/foo/bar' }, {} as Patch);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith(mockReturnValue);
  });

  it('calls resourceExists directly from the source.', async(): Promise<void> => {
    await expect(store.resourceExists({ path: 'http://example.org/foo/bar' })).resolves.toBeUndefined();
    expect(source.resourceExists).toHaveBeenCalledTimes(1);
    expect(source.resourceExists).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, undefined);
  });
});
