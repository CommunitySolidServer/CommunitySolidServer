import type { Patch } from '../../../src/http/representation/Patch';
import type { Representation } from '../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import { MonitoringStore } from '../../../src/storage/MonitoringStore';
import type { ChangeMap, ResourceStore } from '../../../src/storage/ResourceStore';
import { IdentifierMap } from '../../../src/util/map/IdentifierMap';
import { AS, SOLID_AS } from '../../../src/util/Vocabularies';

describe('A MonitoringStore', (): void => {
  let store: MonitoringStore;
  let source: ResourceStore;

  let changedCallback: () => void;
  let createdCallback: () => void;
  let updatedCallback: () => void;
  let deletedCallback: () => void;

  const addResourceReturnMock: ChangeMap = new IdentifierMap([
    [{ path: 'http://example.org/foo/bar/new' }, new RepresentationMetadata({ [SOLID_AS.Activity]: AS.terms.Create }) ],
    [{ path: 'http://example.org/foo/bar/' }, new RepresentationMetadata({ [SOLID_AS.Activity]: AS.terms.Update }) ],
  ]);
  const setRepresentationReturnMock: ChangeMap = new IdentifierMap([
    [{ path: 'http://example.org/foo/bar/new' }, new RepresentationMetadata({ [SOLID_AS.Activity]: AS.terms.Update }) ],
  ]);
  const deleteResourceReturnMock: ChangeMap = new IdentifierMap([
    [{ path: 'http://example.org/foo/bar/new' }, new RepresentationMetadata({ [SOLID_AS.Activity]: AS.terms.Delete }) ],
    [{ path: 'http://example.org/foo/bar/' }, new RepresentationMetadata({ [SOLID_AS.Activity]: AS.terms.Update }) ],
  ]);
  const modifyResourceReturnMock: ChangeMap = new IdentifierMap([
    [{ path: 'http://example.org/foo/bar/old' }, new RepresentationMetadata({ [SOLID_AS.Activity]: AS.terms.Delete }) ],
    [{ path: 'http://example.org/foo/bar/new' }, new RepresentationMetadata({ [SOLID_AS.Activity]: AS.terms.Create }) ],
    [{ path: 'http://example.org/foo/bar/' }, new RepresentationMetadata({ [SOLID_AS.Activity]: AS.terms.Update }) ],
  ]);

  beforeEach(async(): Promise<void> => {
    source = {
      getRepresentation: jest.fn().mockResolvedValue({ success: true }),
      addResource: jest.fn().mockResolvedValue(addResourceReturnMock),
      setRepresentation: jest.fn().mockResolvedValue(setRepresentationReturnMock),
      deleteResource: jest.fn().mockResolvedValue(deleteResourceReturnMock),
      modifyResource: jest.fn().mockResolvedValue(modifyResourceReturnMock),
      hasResource: jest.fn().mockResolvedValue(true),
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
    await expect(store.addResource({ path: 'http://example.org/foo/bar' }, {} as Representation))
      .resolves.toBe(addResourceReturnMock);
    expect(source.addResource).toHaveBeenCalledTimes(1);
    expect(source.addResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, {}, undefined);
  });

  it('fires appropriate events according to the return value of source.addResource.', async(): Promise<void> => {
    const result = store.addResource({ path: 'http://example.org/foo/bar/' }, {} as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(2);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/' }, AS.terms.Update);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' }, AS.terms.Create);
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
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' }, AS.terms.Update);
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
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/' }, AS.terms.Update);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' }, AS.terms.Delete);
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
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' }, AS.terms.Create);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/' }, AS.terms.Update);
    expect(changedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/old' }, AS.terms.Delete);
    expect(createdCallback).toHaveBeenCalledTimes(1);
    expect(createdCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/new' });
    expect(updatedCallback).toHaveBeenCalledTimes(1);
    expect(updatedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/' });
    expect(deletedCallback).toHaveBeenCalledTimes(1);
    expect(deletedCallback).toHaveBeenCalledWith({ path: 'http://example.org/foo/bar/old' });
  });

  it('calls hasResource directly from the source.', async(): Promise<void> => {
    await expect(store.hasResource({ path: 'http://example.org/foo/bar' })).resolves.toBe(true);
    expect(source.hasResource).toHaveBeenCalledTimes(1);
    expect(source.hasResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' });
  });

  it('should not emit an extra event when the Activity is not a valid AS value.', async(): Promise<void> => {
    source.addResource = jest.fn().mockResolvedValue(new IdentifierMap([
      [{ path: 'http://example.org/path' }, new RepresentationMetadata({ [SOLID_AS.Activity]: 'SomethingRandom' }) ],
    ]));

    await store.addResource({ path: 'http://example.org/foo/bar' }, {} as Patch);

    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(createdCallback).toHaveBeenCalledTimes(0);
    expect(updatedCallback).toHaveBeenCalledTimes(0);
    expect(deletedCallback).toHaveBeenCalledTimes(0);
  });
});
