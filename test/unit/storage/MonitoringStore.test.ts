import type { NamedNode } from 'n3';
import type { RepresentationMetadata } from '../../../src';
import type { Patch } from '../../../src/http/representation/Patch';
import type { Representation } from '../../../src/http/representation/Representation';
import { createResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import { MonitoringStore } from '../../../src/storage/MonitoringStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { ModificationType, createModifiedResource } from '../../../src/storage/ResourceStore';

describe('A MonitoringStore', (): void => {
  let store: MonitoringStore;
  let source: ResourceStore;
  let changedCallback: () => void;
  const addedResource = createModifiedResource(createResourceIdentifier('http://example.org/foo/bar/new'), ModificationType.created);
  const createdResources = [
    createModifiedResource(createResourceIdentifier('http://example.org/created/'), ModificationType.changed),
    createModifiedResource(createResourceIdentifier('http://example.org/created/1'), ModificationType.created),
    createModifiedResource(createResourceIdentifier('http://example.org/created/2'), ModificationType.created),
  ];

  const changedResources = [
    createModifiedResource(createResourceIdentifier('http://example.org/changed/'), ModificationType.changed),
    createModifiedResource(createResourceIdentifier('http://example.org/changed/1'), ModificationType.changed),
    createModifiedResource(createResourceIdentifier('http://example.org/changed/2'), ModificationType.changed),
  ];

  const deletedResources = [
    createModifiedResource(createResourceIdentifier('http://example.org/deleted/'), ModificationType.changed),
    createModifiedResource(createResourceIdentifier('http://example.org/deleted/container'), ModificationType.deleted),
    createModifiedResource(createResourceIdentifier('http://example.org/deleted/container/resource'), ModificationType.deleted),
  ];

  const changedInternalResources = [
    createModifiedResource(createResourceIdentifier('http://example.org/.internal/modified/1'), ModificationType.changed),
    createModifiedResource(createResourceIdentifier('http://example.org/.internal/modified/2'), ModificationType.changed),
  ];

  const modifyResourceMockFn = jest.fn(async(): Promise<any> => changedResources);

  beforeEach(async(): Promise<void> => {
    source = {
      getRepresentation: jest.fn(async(): Promise<any> => ({ success: true })),
      addResource: jest.fn(async(): Promise<any> => addedResource),
      setRepresentation: jest.fn(async(): Promise<any> => createdResources),
      deleteResource: jest.fn(async(): Promise<any> => deletedResources),
      modifyResource: modifyResourceMockFn,
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
    await expect(store.addResource({ path: 'http://example.org/foo/bar' }, {} as Representation)).resolves
      .toStrictEqual(createModifiedResource(createResourceIdentifier('http://example.org/foo/bar/new'), ModificationType.created));
    expect(source.addResource).toHaveBeenCalledTimes(1);
    expect(source.addResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, {}, undefined);
  });

  it('fires container and resource change event after addResource.', async(): Promise<void> => {
    const result = store.addResource({ path: 'http://example.org/foo/bar/' },
      { metadata: { id: { value: 'http://example.org/foo/bar/new' } as NamedNode } as unknown as RepresentationMetadata } as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith([
      createModifiedResource(createResourceIdentifier('http://example.org/foo/bar/'), ModificationType.changed),
      createModifiedResource(createResourceIdentifier('http://example.org/foo/bar/new'), ModificationType.created),
    ]);
  });

  it('calls setRepresentation directly from the source.', async(): Promise<void> => {
    await expect(store.setRepresentation({ path: 'http://example.org/foo/bar' }, {} as Representation))
      .resolves.toEqual(createdResources);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, {}, undefined);
  });

  it('fires change event after setRepresentation.', async(): Promise<void> => {
    const result = store.setRepresentation({ path: 'http://example.org/created/' }, {} as Representation);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith([
      createModifiedResource(createResourceIdentifier('http://example.org/created/'), ModificationType.changed),
      createModifiedResource(createResourceIdentifier('http://example.org/created/1'), ModificationType.created),
      createModifiedResource(createResourceIdentifier('http://example.org/created/2'), ModificationType.created),
    ]);
  });

  it('calls deleteResource directly from the source.', async(): Promise<void> => {
    await expect(store.deleteResource({ path: 'http://example.org/foo/bar' }))
      .resolves.toEqual(deletedResources);
    expect(source.deleteResource).toHaveBeenCalledTimes(1);
    expect(source.deleteResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, undefined);
  });

  it('fires change event after deleteResource.', async(): Promise<void> => {
    const result = store.deleteResource({ path: 'http://example.org/deleted/container/' });
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith([
      createModifiedResource(createResourceIdentifier('http://example.org/deleted/'), ModificationType.changed),
      createModifiedResource(createResourceIdentifier('http://example.org/deleted/container'), ModificationType.deleted),
      createModifiedResource(createResourceIdentifier('http://example.org/deleted/container/resource'), ModificationType.deleted),
    ]);
  });

  it('calls modifyResource directly from the source.', async(): Promise<void> => {
    await expect(store.modifyResource({ path: 'http://example.org/foo/bar' }, {} as Patch))
      .resolves.toEqual(changedResources);
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    expect(source.modifyResource).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, {}, undefined);
  });

  it('fires change event after modifyResource.', async(): Promise<void> => {
    const result = store.modifyResource({ path: 'http://example.org/changed/' }, {} as Patch);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(1);
    expect(changedCallback).toHaveBeenCalledWith([
      createModifiedResource(createResourceIdentifier('http://example.org/changed/'), ModificationType.changed),
      createModifiedResource(createResourceIdentifier('http://example.org/changed/1'), ModificationType.changed),
      createModifiedResource(createResourceIdentifier('http://example.org/changed/2'), ModificationType.changed),
    ]);
  });

  it('calls resourceExists directly from the source.', async(): Promise<void> => {
    await expect(store.resourceExists({ path: 'http://example.org/foo/bar' })).resolves.toBeUndefined();
    expect(source.resourceExists).toHaveBeenCalledTimes(1);
    expect(source.resourceExists).toHaveBeenLastCalledWith({ path: 'http://example.org/foo/bar' }, undefined);
  });

  it('does not result in change event when internal resources are modified.', async(): Promise<void> => {
    modifyResourceMockFn.mockImplementationOnce(async(): Promise<any> => changedInternalResources);
    const result = store.modifyResource({ path: 'http://example.org/.internal/resource' }, {} as Patch);
    expect(changedCallback).toHaveBeenCalledTimes(0);
    await result;
    expect(changedCallback).toHaveBeenCalledTimes(0);
  });
});
