import type { Patch } from '../../../src/http/representation/Patch';
import type { Representation } from '../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import { MonitoringStore } from '../../../src/storage/MonitoringStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { AS, SOLID_AS } from '../../../src/util/Vocabularies';

describe('A MonitoringStore', (): void => {
  let store: MonitoringStore;
  let source: ResourceStore;
  let changedCallback: () => void;
  const modified = {
    'http://example.org/modified/1': new RepresentationMetadata({ path: 'http://example.org/modified/1' })
      .add(SOLID_AS.terms.Activity, AS.Create),
    'http://example.org/modified/2': new RepresentationMetadata({ path: 'http://example.org/modified/2' })
      .add(SOLID_AS.terms.Activity, AS.Update),
    'http://example.org/modified/3': new RepresentationMetadata({ path: 'http://example.org/modified/3' })
      .add(SOLID_AS.terms.Activity, AS.Delete),
  };

  beforeEach(async(): Promise<void> => {
    source = {
      getRepresentation: jest.fn(async(): Promise<any> => ({ success: true })),
      addResource: jest.fn(async(): Promise<any> => ({
        'http://example.org/foo/bar/new': new RepresentationMetadata({ path: 'http://example.org/foo/bar/new' })
          .add(SOLID_AS.terms.Activity, AS.Create),
        'http://example.org/foo/bar/': new RepresentationMetadata({ path: 'http://example.org/foo/bar/' })
          .add(SOLID_AS.terms.Activity, AS.Update),
      })),
      setRepresentation: jest.fn(async(): Promise<any> => modified),
      deleteResource: jest.fn(async(): Promise<any> => modified),
      modifyResource: jest.fn(async(): Promise<any> => modified),
      hasResource: jest.fn(async(): Promise<any> => undefined),
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
    await expect(store.addResource({ path: 'http://example.org/foo/bar' }, {} as Representation)).resolves.toEqual({
      'http://example.org/foo/bar/new': expect.any(RepresentationMetadata),
      'http://example.org/foo/bar/': expect.any(RepresentationMetadata),
    });
    expect(source.addResource).toHaveBeenCalledTimes(1);
    expect(source.addResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, {}, undefined);
  });

  it('fires container and resource change events after addResource.', async(): Promise<void> => {
    const result = store.addResource({ path: 'http://example.org/foo/bar/' }, {} as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(2);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/' }, AS.Update);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' }, AS.Create);
  });

  it('calls setRepresentation directly from the source.', async(): Promise<void> => {
    await expect(store.setRepresentation({ path: 'http://example.org/foo/bar' }, {} as Representation))
      .resolves.toEqual(modified);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, {}, undefined);
  });

  it('fires all modified change events after setRepresentation.', async(): Promise<void> => {
    const result = store.setRepresentation({ path: 'http://example.org/foo/bar' }, {} as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(3);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/modified/1' }, AS.Create);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/modified/2' }, AS.Update);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/modified/3' }, AS.Delete);
  });

  it('calls deleteResource directly from the source.', async(): Promise<void> => {
    await expect(store.deleteResource({ path: 'http://example.org/foo/bar' }))
      .resolves.toEqual(modified);
    expect(source.deleteResource).toHaveBeenCalledTimes(1);
    expect(source.deleteResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, undefined);
  });

  it('fires all modified change events after deleteResource.', async(): Promise<void> => {
    const result = store.deleteResource({ path: 'http://example.org/foo/bar' });
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(3);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/modified/1' }, AS.Create);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/modified/2' }, AS.Update);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/modified/3' }, AS.Delete);
  });

  it('calls modifyResource directly from the source.', async(): Promise<void> => {
    await expect(store.modifyResource({ path: 'http://example.org/foo/bar' }, {} as Patch))
      .resolves.toEqual(modified);
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    expect(source.modifyResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, {}, undefined);
  });

  it('fires all modified change events after modifyResource.', async(): Promise<void> => {
    const result = store.modifyResource({ path: 'http://example.org/foo/bar' }, {} as Patch);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(3);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/modified/1' }, AS.Create);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/modified/2' }, AS.Update);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/modified/3' }, AS.Delete);
  });

  it('calls hasResource directly from the source.', async(): Promise<void> => {
    await expect(store.hasResource({ path: 'http://example.org/foo/bar' })).resolves.toBeUndefined();
    expect(source.hasResource).toHaveBeenCalledTimes(1);
    expect(source.hasResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' });
  });

  it('fires specific created, deleted and updated events.', async(): Promise<void> => {
    const deletedCb = jest.fn();
    store.on('deleted', deletedCb);
    const updatedCb = jest.fn();
    store.on('updated', updatedCb);
    const createdCb = jest.fn();
    store.on('created', createdCb);
    await store.modifyResource({ path: 'http://example.org/foo/bar' }, {} as Patch);

    expect(createdCb).toHaveBeenCalledTimes(1);
    expect(createdCb).toHaveBeenCalledWith({ path: 'http://example.org/modified/1' });
    expect(updatedCb).toHaveBeenCalledTimes(1);
    expect(updatedCb).toHaveBeenCalledWith({ path: 'http://example.org/modified/2' });
    expect(deletedCb).toHaveBeenCalledTimes(1);
    expect(deletedCb).toHaveBeenCalledWith({ path: 'http://example.org/modified/3' });

    store.removeListener('created', createdCb);
    store.removeListener('deleted', deletedCb);
    store.removeListener('updated', updatedCb);
  });

  it('should not emit an extra event when the Activity is not a valid AS value.', async(): Promise<void> => {
    source.addResource = jest.fn(async(): Promise<any> => ({
      'path': new RepresentationMetadata({ path: 'path' }).add(SOLID_AS.terms.Activity, 'SomethingRandom'),
    }));
    const deletedCb = jest.fn();
    store.on('deleted', deletedCb);
    const updatedCb = jest.fn();
    store.on('updated', updatedCb);
    const createdCb = jest.fn();
    store.on('created', createdCb);
    await store.addResource({ path: 'http://example.org/foo/bar' }, {} as Patch);

    expect(createdCb).toHaveBeenCalledTimes(0);
    expect(updatedCb).toHaveBeenCalledTimes(0);
    expect(deletedCb).toHaveBeenCalledTimes(0);

    store.removeListener('created', createdCb);
    store.removeListener('deleted', deletedCb);
    store.removeListener('updated', updatedCb);
  });
});
