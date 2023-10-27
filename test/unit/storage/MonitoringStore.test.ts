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

  const id = { path: 'http://example.org/foo/bar/' };
  const idNew = { path: 'http://example.org/foo/bar/new' };
  const idOld = { path: 'http://example.org/foo/bar/old' };

  let changedCallback: () => void;
  let createdCallback: () => void;
  let updatedCallback: () => void;
  let deletedCallback: () => void;

  const addResourceReturnMock: ChangeMap = new IdentifierMap([
    [ idNew, new RepresentationMetadata({ [SOLID_AS.activity]: AS.terms.Create }) ],
    [ id, new RepresentationMetadata({ [SOLID_AS.activity]: AS.terms.Update }) ],
  ]);
  const setRepresentationReturnMock: ChangeMap = new IdentifierMap([
    [ idNew, new RepresentationMetadata({ [SOLID_AS.activity]: AS.terms.Update }) ],
  ]);
  const deleteResourceReturnMock: ChangeMap = new IdentifierMap([
    [ idNew, new RepresentationMetadata({ [SOLID_AS.activity]: AS.terms.Delete }) ],
    [ id, new RepresentationMetadata({ [SOLID_AS.activity]: AS.terms.Update }) ],
  ]);
  const modifyResourceReturnMock: ChangeMap = new IdentifierMap([
    [ idOld, new RepresentationMetadata({ [SOLID_AS.activity]: AS.terms.Delete }) ],
    [ idNew, new RepresentationMetadata({ [SOLID_AS.activity]: AS.terms.Create }) ],
    [ id, new RepresentationMetadata({ [SOLID_AS.activity]: AS.terms.Update }) ],
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
    await store.getRepresentation(id, {});
    expect(changedCallback).toHaveBeenCalledTimes(0);
  });

  it('calls addResource directly from the source.', async(): Promise<void> => {
    await expect(store.addResource(id, {} as Representation))
      .resolves.toBe(addResourceReturnMock);
    expect(source.addResource).toHaveBeenCalledTimes(1);
    expect(source.addResource).toHaveBeenLastCalledWith(id, {}, undefined);
  });

  it('fires appropriate events according to the return value of source.addResource.', async(): Promise<void> => {
    const result = store.addResource(id, {} as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(2);
    expect(changedCallback).toHaveBeenCalledWith(id, AS.terms.Update, addResourceReturnMock.get(id));
    expect(changedCallback).toHaveBeenCalledWith(idNew, AS.terms.Create, addResourceReturnMock.get(idNew));
    expect(createdCallback).toHaveBeenCalledTimes(1);
    expect(createdCallback).toHaveBeenCalledWith(idNew, addResourceReturnMock.get(idNew));
    expect(updatedCallback).toHaveBeenCalledTimes(1);
    expect(updatedCallback).toHaveBeenCalledWith(id, addResourceReturnMock.get(id));
    expect(deletedCallback).toHaveBeenCalledTimes(0);
  });

  it('calls setRepresentation directly from the source.', async(): Promise<void> => {
    await expect(store.setRepresentation(id, {} as Representation))
      .resolves.toEqual(setRepresentationReturnMock);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith(id, {}, undefined);
  });

  it('fires appropriate events according to the return value of source.setRepresentation.', async(): Promise<void> => {
    const result = store.setRepresentation(id, {} as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith(idNew, AS.terms.Update, setRepresentationReturnMock.get(idNew));
    expect(createdCallback).toHaveBeenCalledTimes(0);
    expect(updatedCallback).toHaveBeenCalledTimes(1);
    expect(updatedCallback).toHaveBeenCalledWith(idNew, setRepresentationReturnMock.get(idNew));
    expect(deletedCallback).toHaveBeenCalledTimes(0);
  });

  it('calls deleteResource directly from the source.', async(): Promise<void> => {
    await expect(store.deleteResource(id))
      .resolves.toEqual(deleteResourceReturnMock);
    expect(source.deleteResource).toHaveBeenCalledTimes(1);
    expect(source.deleteResource).toHaveBeenLastCalledWith(id, undefined);
  });

  it('fires appropriate events according to the return value of source.deleteResource.', async(): Promise<void> => {
    const result = store.deleteResource(id);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(2);
    expect(changedCallback).toHaveBeenCalledWith(id, AS.terms.Update, deleteResourceReturnMock.get(id));
    expect(changedCallback).toHaveBeenCalledWith(idNew, AS.terms.Delete, deleteResourceReturnMock.get(idNew));
    expect(createdCallback).toHaveBeenCalledTimes(0);
    expect(updatedCallback).toHaveBeenCalledTimes(1);
    expect(updatedCallback).toHaveBeenCalledWith(id, deleteResourceReturnMock.get(id));
    expect(deletedCallback).toHaveBeenCalledTimes(1);
    expect(deletedCallback).toHaveBeenCalledWith(idNew, deleteResourceReturnMock.get(idNew));
  });

  it('calls modifyResource directly from the source.', async(): Promise<void> => {
    await expect(store.modifyResource(id, {} as Patch))
      .resolves.toEqual(modifyResourceReturnMock);
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    expect(source.modifyResource).toHaveBeenLastCalledWith(id, {}, undefined);
  });

  it('fires appropriate events according to the return value of source.modifyResource.', async(): Promise<void> => {
    const result = store.modifyResource(id, {} as Patch);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(3);
    expect(changedCallback).toHaveBeenCalledWith(idNew, AS.terms.Create, modifyResourceReturnMock.get(idNew));
    expect(changedCallback).toHaveBeenCalledWith(id, AS.terms.Update, modifyResourceReturnMock.get(id));
    expect(changedCallback).toHaveBeenCalledWith(idOld, AS.terms.Delete, modifyResourceReturnMock.get(idOld));
    expect(createdCallback).toHaveBeenCalledTimes(1);
    expect(createdCallback).toHaveBeenCalledWith(idNew, modifyResourceReturnMock.get(idNew));
    expect(updatedCallback).toHaveBeenCalledTimes(1);
    expect(updatedCallback).toHaveBeenCalledWith(id, modifyResourceReturnMock.get(id));
    expect(deletedCallback).toHaveBeenCalledTimes(1);
    expect(deletedCallback).toHaveBeenCalledWith(idOld, modifyResourceReturnMock.get(idOld));
  });

  it('calls hasResource directly from the source.', async(): Promise<void> => {
    await expect(store.hasResource(id)).resolves.toBe(true);
    expect(source.hasResource).toHaveBeenCalledTimes(1);
    expect(source.hasResource).toHaveBeenLastCalledWith(id);
  });

  it('should not emit an event when the Activity is not a valid AS value.', async(): Promise<void> => {
    jest.spyOn(source, 'addResource').mockResolvedValue(new IdentifierMap([
      [{ path: 'http://example.org/path' }, new RepresentationMetadata({ [SOLID_AS.activity]: 'SomethingRandom' }) ],
    ]));

    await store.addResource(id, {} as Patch);

    expect(changedCallback).toHaveBeenCalledTimes(0);
    expect(createdCallback).toHaveBeenCalledTimes(0);
    expect(updatedCallback).toHaveBeenCalledTimes(0);
    expect(deletedCallback).toHaveBeenCalledTimes(0);
  });
});
