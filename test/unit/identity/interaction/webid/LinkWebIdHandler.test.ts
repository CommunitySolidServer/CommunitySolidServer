import { PodStore } from '../../../../../src/identity/interaction/pod/util/PodStore';
import { LinkWebIdHandler } from '../../../../../src/identity/interaction/webid/LinkWebIdHandler';
import { WebIdStore } from '../../../../../src/identity/interaction/webid/util/WebIdStore';
import type { WebIdLinkRoute } from '../../../../../src/identity/interaction/webid/WebIdLinkRoute';
import { OwnershipValidator } from '../../../../../src/identity/ownership/OwnershipValidator';
import { StorageLocationStrategy } from '../../../../../src/server/description/StorageLocationStrategy';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';

describe('A LinkWebIdHandler', (): void => {
  const id = 'id';
  const accountId = 'accountId';
  const webId = 'http://example.com/pod/profile/card#me';
  let json: unknown;
  const resource = 'http://example.com/.account/link';
  const baseUrl = 'http://example.com/';
  const podUrl = 'http://example.com/pod/';
  let ownershipValidator: jest.Mocked<OwnershipValidator>;
  let podStore: jest.Mocked<PodStore>;
  let webIdStore: jest.Mocked<WebIdStore>;
  let webIdRoute: jest.Mocked<WebIdLinkRoute>;
  let storageStrategy: jest.Mocked<StorageLocationStrategy>;
  let handler: LinkWebIdHandler;

  beforeEach(async(): Promise<void> => {
    json = { webId };

    ownershipValidator = {
      handleSafe: jest.fn(),
    } satisfies Partial<OwnershipValidator> as any;

    podStore = {
      findAccount: jest.fn().mockResolvedValue(accountId),
    } satisfies Partial<PodStore> as any;

    webIdStore = {
      create: jest.fn().mockResolvedValue(id),
      isLinked: jest.fn().mockResolvedValue(false),
      findLinks: jest.fn().mockResolvedValue([{ id, webId }]),
    } satisfies Partial<WebIdStore> as any;

    webIdRoute = {
      getPath: jest.fn().mockReturnValue(resource),
      matchPath: jest.fn(),
    };

    storageStrategy = {
      getStorageIdentifier: jest.fn().mockReturnValue({ path: podUrl }),
    } satisfies Partial<StorageLocationStrategy> as any;

    handler = new LinkWebIdHandler({
      podStore,
      webIdRoute,
      webIdStore,
      ownershipValidator,
      baseUrl,
      storageStrategy,
    });
  });

  it('requires a WebID as input and returns the linked WebIds.', async(): Promise<void> => {
    await expect(handler.getView({ accountId } as any)).resolves.toEqual({
      json: {
        webIdLinks: {
          [webId]: resource,
        },
        fields: {
          webId: { required: true, type: 'string' },
        },
      },
    });
    expect(webIdStore.findLinks).toHaveBeenCalledTimes(1);
    expect(webIdStore.findLinks).toHaveBeenLastCalledWith(accountId);
  });

  it('links the WebID if the account created the pod it is in.', async(): Promise<void> => {
    await expect(handler.handle({ accountId, json } as any)).resolves.toEqual({
      json: { resource, webId, oidcIssuer: baseUrl },
    });
    expect(webIdStore.isLinked).toHaveBeenCalledTimes(1);
    expect(webIdStore.isLinked).toHaveBeenLastCalledWith(webId, accountId);
    expect(storageStrategy.getStorageIdentifier).toHaveBeenCalledTimes(1);
    expect(storageStrategy.getStorageIdentifier).toHaveBeenLastCalledWith({ path: webId });
    expect(podStore.findAccount).toHaveBeenCalledTimes(1);
    expect(podStore.findAccount).toHaveBeenLastCalledWith(podUrl);
    expect(webIdStore.create).toHaveBeenCalledTimes(1);
    expect(webIdStore.create).toHaveBeenLastCalledWith(webId, accountId);
    expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('throws an error if the WebID is already registered to this account.', async(): Promise<void> => {
    webIdStore.isLinked.mockResolvedValueOnce(true);
    await expect(handler.handle({ accountId, json } as any)).rejects.toThrow(BadRequestHttpError);
    expect(webIdStore.isLinked).toHaveBeenCalledTimes(1);
    expect(webIdStore.isLinked).toHaveBeenLastCalledWith(webId, accountId);
    expect(storageStrategy.getStorageIdentifier).toHaveBeenCalledTimes(0);
    expect(podStore.findAccount).toHaveBeenCalledTimes(0);
    expect(webIdStore.create).toHaveBeenCalledTimes(0);
  });

  it('calls the ownership validator if the account did not create the pod the WebID is in.', async(): Promise<void> => {
    podStore.findAccount.mockResolvedValueOnce(undefined);
    await expect(handler.handle({ accountId, json } as any)).resolves.toEqual({
      json: { resource, webId, oidcIssuer: baseUrl },
    });
    expect(webIdStore.isLinked).toHaveBeenCalledTimes(1);
    expect(webIdStore.isLinked).toHaveBeenLastCalledWith(webId, accountId);
    expect(storageStrategy.getStorageIdentifier).toHaveBeenCalledTimes(1);
    expect(storageStrategy.getStorageIdentifier).toHaveBeenLastCalledWith({ path: webId });
    expect(podStore.findAccount).toHaveBeenCalledTimes(1);
    expect(podStore.findAccount).toHaveBeenLastCalledWith(podUrl);
    expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
    expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
    expect(webIdStore.create).toHaveBeenCalledTimes(1);
    expect(webIdStore.create).toHaveBeenLastCalledWith(webId, accountId);
  });
});
