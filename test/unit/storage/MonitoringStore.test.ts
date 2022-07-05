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
  let createdCallback: () => void;
  let updatedCallback: () => void;
  let deletedCallback: () => void;

  const addResourceReturnMock = {
    'http://example.org/foo/bar/new': new RepresentationMetadata(
      { path: 'http://example.org/foo/bar/new' },
      { [SOLID_AS.terms.Activity.value]: AS.Create },
    ),
    'http://example.org/foo/bar/': new RepresentationMetadata(
      { path: 'http://example.org/foo/bar/' },
      { [SOLID_AS.terms.Activity.value]: AS.Update },
    ),
  };
  const setRepresentationReturnMock = {
    'http://example.org/foo/bar/new': new RepresentationMetadata(
      { path: 'http://example.org/foo/bar/new' },
      { [SOLID_AS.terms.Activity.value]: AS.Update },
    ),
  };
  const deleteResourceReturnMock = {
    'http://example.org/foo/bar/new': new RepresentationMetadata(
      { path: 'http://example.org/foo/bar/new' },
      { [SOLID_AS.terms.Activity.value]: AS.Delete },
    ),
    'http://example.org/foo/bar/': new RepresentationMetadata(
      { path: 'http://example.org/foo/bar/' },
      { [SOLID_AS.terms.Activity.value]: AS.Update },
    ),
  };
  const modifyResourceReturnMock = {
    'http://example.org/foo/bar/old': new RepresentationMetadata(
      { path: 'http://example.org/foo/bar/new' },
      { [SOLID_AS.terms.Activity.value]: AS.Delete },
    ),
    'http://example.org/foo/bar/new': new RepresentationMetadata(
      { path: 'http://example.org/foo/bar/new' },
      { [SOLID_AS.terms.Activity.value]: AS.Create },
    ),
    'http://example.org/foo/bar/': new RepresentationMetadata(
      { path: 'http://example.org/foo/bar/' },
      { [SOLID_AS.terms.Activity.value]: AS.Update },
    ),
  };

  beforeEach(async(): Promise<void> => {
    source = {
      getRepresentation: jest.fn(async(): Promise<any> => ({ success: true })),
      addResource: jest.fn(async(): Promise<any> => addResourceReturnMock),
      setRepresentation: jest.fn(async(): Promise<any> => setRepresentationReturnMock),
      deleteResource: jest.fn(async(): Promise<any> => deleteResourceReturnMock),
      modifyResource: jest.fn(async(): Promise<any> => modifyResourceReturnMock),
      hasResource: jest.fn(async(): Promise<any> => undefined),
    };
    store = new MonitoringStore(source);

    changedCallback = jest.fn();
    createdCallback = jest.fn();
    updatedCallback = jest.fn();
    deletedCallback = jest.fn();
    store.on('changed', changedCallback);
    store.on(AS.Create, createdCallback);
    store.on(AS.Update, updatedCallback);
    store.on(AS.Delete, deletedCallback);
  });

  afterEach(async(): Promise<void> => {
    store.removeListener('changed', changedCallback);
    store.removeListener(AS.Create, createdCallback);
    store.removeListener(AS.Update, updatedCallback);
    store.removeListener(AS.Delete, deletedCallback);
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

  it('fires appropriate events according to the return value of source.addResource.', async(): Promise<void> => {
    const result = store.addResource({ path: 'http://example.org/foo/bar/' }, {} as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(2);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/' }, AS.Update);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' }, AS.Create);
    expect(createdCallback).toHaveBeenCalledTimes(1);
    expect(createdCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' });
    expect(updatedCallback).toHaveBeenCalledTimes(1);
    expect(updatedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/' });
    expect(deletedCallback).toHaveBeenCalledTimes(0);
  });

  it('calls setRepresentation directly from the source.', async(): Promise<void> => {
    await expect(store.setRepresentation({ path: 'http://example.org/foo/bar' }, {} as Representation))
      .resolves.toEqual(setRepresentationReturnMock);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, {}, undefined);
  });

  it('fires appropriate events according to the return value of source.setRepresentation.', async(): Promise<void> => {
    const result = store.setRepresentation({ path: 'http://example.org/foo/bar' }, {} as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' }, AS.Update);
    expect(createdCallback).toHaveBeenCalledTimes(0);
    expect(updatedCallback).toHaveBeenCalledTimes(1);
    expect(updatedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' });
    expect(deletedCallback).toHaveBeenCalledTimes(0);
  });

  it('calls deleteResource directly from the source.', async(): Promise<void> => {
    await expect(store.deleteResource({ path: 'http://example.org/foo/bar' }))
      .resolves.toEqual(deleteResourceReturnMock);
    expect(source.deleteResource).toHaveBeenCalledTimes(1);
    expect(source.deleteResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, undefined);
  });

  it('fires appropriate events according to the return value of source.deleteResource.', async(): Promise<void> => {
    const result = store.deleteResource({ path: 'http://example.org/foo/bar' });
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(2);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/' }, AS.Update);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' }, AS.Delete);
    expect(createdCallback).toHaveBeenCalledTimes(0);
    expect(updatedCallback).toHaveBeenCalledTimes(1);
    expect(updatedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/' });
    expect(deletedCallback).toHaveBeenCalledTimes(1);
    expect(deletedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' });
  });

  it('calls modifyResource directly from the source.', async(): Promise<void> => {
    await expect(store.modifyResource({ path: 'http://example.org/foo/bar' }, {} as Patch))
      .resolves.toEqual(modifyResourceReturnMock);
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    expect(source.modifyResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, {}, undefined);
  });

  it('fires appropriate events according to the return value of source.modifyResource.', async(): Promise<void> => {
    const result = store.modifyResource({ path: 'http://example.org/foo/bar' }, {} as Patch);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(3);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' }, AS.Create);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/' }, AS.Update);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/old' }, AS.Delete);
    expect(createdCallback).toHaveBeenCalledTimes(1);
    expect(createdCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' });
    expect(updatedCallback).toHaveBeenCalledTimes(1);
    expect(updatedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/' });
    expect(deletedCallback).toHaveBeenCalledTimes(1);
    expect(deletedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/old' });
  });

  it('calls hasResource directly from the source.', async(): Promise<void> => {
    await expect(store.hasResource({ path: 'http://example.org/foo/bar' })).resolves.toBeUndefined();
    expect(source.hasResource).toHaveBeenCalledTimes(1);
    expect(source.hasResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' });
  });

  it('should not emit an extra event when the Activity is not a valid AS value.', async(): Promise<void> => {
    source.addResource = jest.fn(async(): Promise<any> => ({
      'http://example.com/path': new RepresentationMetadata(
        { path: 'http://example.com/path' },
        { [SOLID_AS.terms.Activity.value]: 'SomethingRandom' },
      ),
    }));

    await store.addResource({ path: 'http://example.org/foo/bar' }, {} as Patch);

    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(createdCallback).toHaveBeenCalledTimes(0);
    expect(updatedCallback).toHaveBeenCalledTimes(0);
    expect(deletedCallback).toHaveBeenCalledTimes(0);
  });
});
