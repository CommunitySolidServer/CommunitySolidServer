import type { ServerResponse } from 'node:http';
import { createResponse } from 'node-mocks-http';
import { RepresentationMetadata } from '../../../../../../src/http/representation/RepresentationMetadata';
import { OwnerMetadataWriter } from '../../../../../../src/identity/interaction/pod/util/OwnerMetadataWriter';
import type { PodStore } from '../../../../../../src/identity/interaction/pod/util/PodStore';
import type { StorageLocationStrategy } from '../../../../../../src/server/description/StorageLocationStrategy';
import type { HttpResponse } from '../../../../../../src/server/HttpResponse';
import { joinUrl } from '../../../../../../src/util/PathUtil';

describe('An OwnerMetadataWriter', (): void => {
  const id = 'id';
  const accountId = 'accountId';
  const target = { path: 'http://example.com/pod/' };
  const webId = 'http://example.com/webId#me';
  let metadata: RepresentationMetadata;
  let response: ServerResponse;
  let podStore: jest.Mocked<PodStore>;
  let storageStrategy: jest.Mocked<StorageLocationStrategy>;
  let writer: OwnerMetadataWriter;

  beforeEach(async(): Promise<void> => {
    metadata = new RepresentationMetadata(target);

    response = createResponse() as HttpResponse;

    podStore = {
      findByBaseUrl: jest.fn().mockResolvedValue({ id, accountId }),
      getOwners: jest.fn().mockResolvedValue([{ webId, visible: true }]),
    } satisfies Partial<PodStore> as any;

    storageStrategy = {
      getStorageIdentifier: jest.fn().mockResolvedValue(target),
    };

    writer = new OwnerMetadataWriter(podStore, storageStrategy);
  });

  it('adds the correct link headers.', async(): Promise<void> => {
    await expect(writer.handle({ metadata, response })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ link: `<${webId}>; rel="http://www.w3.org/ns/solid/terms#owner"` });
    expect(storageStrategy.getStorageIdentifier).toHaveBeenCalledTimes(1);
    expect(storageStrategy.getStorageIdentifier).toHaveBeenLastCalledWith(target);
    expect(podStore.findByBaseUrl).toHaveBeenCalledTimes(1);
    expect(podStore.findByBaseUrl).toHaveBeenLastCalledWith(target.path);
    expect(podStore.getOwners).toHaveBeenCalledTimes(1);
    expect(podStore.getOwners).toHaveBeenLastCalledWith(id);
  });

  it('adds no headers if the identifier is a blank node.', async(): Promise<void> => {
    metadata = new RepresentationMetadata();
    await expect(writer.handle({ metadata, response })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
    expect(storageStrategy.getStorageIdentifier).toHaveBeenCalledTimes(0);
    expect(podStore.findByBaseUrl).toHaveBeenCalledTimes(0);
    expect(podStore.getOwners).toHaveBeenCalledTimes(0);
  });

  it('adds no headers if no root storage could be found.', async(): Promise<void> => {
    storageStrategy.getStorageIdentifier.mockRejectedValueOnce(new Error('bad identifier'));
    await expect(writer.handle({ metadata, response })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
    expect(storageStrategy.getStorageIdentifier).toHaveBeenCalledTimes(1);
    expect(storageStrategy.getStorageIdentifier).toHaveBeenLastCalledWith(target);
    expect(podStore.findByBaseUrl).toHaveBeenCalledTimes(0);
    expect(podStore.getOwners).toHaveBeenCalledTimes(0);
  });

  it('adds no headers if the target is not a pod base URL.', async(): Promise<void> => {
    metadata = new RepresentationMetadata({ path: joinUrl(target.path, 'document') });
    await expect(writer.handle({ metadata, response })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
    expect(storageStrategy.getStorageIdentifier).toHaveBeenCalledTimes(1);
    expect(storageStrategy.getStorageIdentifier).toHaveBeenLastCalledWith({ path: joinUrl(target.path, 'document') });
    expect(podStore.findByBaseUrl).toHaveBeenCalledTimes(0);
    expect(podStore.getOwners).toHaveBeenCalledTimes(0);
  });

  it('adds no headers if there is no matching pod object.', async(): Promise<void> => {
    podStore.findByBaseUrl.mockResolvedValueOnce(undefined);
    await expect(writer.handle({ metadata, response })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
    expect(storageStrategy.getStorageIdentifier).toHaveBeenCalledTimes(1);
    expect(storageStrategy.getStorageIdentifier).toHaveBeenLastCalledWith(target);
    expect(podStore.findByBaseUrl).toHaveBeenCalledTimes(1);
    expect(podStore.findByBaseUrl).toHaveBeenLastCalledWith(target.path);
    expect(podStore.getOwners).toHaveBeenCalledTimes(0);
  });

  it('adds no headers if there are no matching owners.', async(): Promise<void> => {
    podStore.getOwners.mockResolvedValueOnce(undefined);
    await expect(writer.handle({ metadata, response })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
    expect(storageStrategy.getStorageIdentifier).toHaveBeenCalledTimes(1);
    expect(storageStrategy.getStorageIdentifier).toHaveBeenLastCalledWith(target);
    expect(podStore.findByBaseUrl).toHaveBeenCalledTimes(1);
    expect(podStore.findByBaseUrl).toHaveBeenLastCalledWith(target.path);
    expect(podStore.getOwners).toHaveBeenCalledTimes(1);
    expect(podStore.getOwners).toHaveBeenLastCalledWith(id);
  });
});
