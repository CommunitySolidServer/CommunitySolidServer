import type { PodStore } from '../../../../../src/identity/interaction/pod/util/PodStore';
import { LinkWebIdHandler } from '../../../../../src/identity/interaction/webid/LinkWebIdHandler';
import type { WebIdStore } from '../../../../../src/identity/interaction/webid/util/WebIdStore';
import type { WebIdLinkRoute } from '../../../../../src/identity/interaction/webid/WebIdLinkRoute';
import type { OwnershipValidator } from '../../../../../src/identity/ownership/OwnershipValidator';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';

describe('A LinkWebIdHandler', (): void => {
  const id = 'id';
  const podId = 'podId';
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
  let handler: LinkWebIdHandler;

  beforeEach(async(): Promise<void> => {
    json = { webId };

    ownershipValidator = {
      handleSafe: jest.fn(),
    } satisfies Partial<OwnershipValidator> as any;

    podStore = {
      findPods: jest.fn().mockResolvedValue([{ id: podId, baseUrl: podUrl }]),
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

    handler = new LinkWebIdHandler({
      podStore,
      webIdRoute,
      webIdStore,
      ownershipValidator,
      baseUrl,
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
    expect(podStore.findPods).toHaveBeenCalledTimes(1);
    expect(podStore.findPods).toHaveBeenLastCalledWith(accountId);
    expect(webIdStore.create).toHaveBeenCalledTimes(1);
    expect(webIdStore.create).toHaveBeenLastCalledWith(webId, accountId);
    expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('links a WebID in a subdomain-style pod of the account.', async(): Promise<void> => {
    const subdomainWebId = 'http://alice.example.com/profile/card#me';
    podStore.findPods.mockResolvedValueOnce([{ id: podId, baseUrl: 'http://alice.example.com/' }]);
    json = { webId: subdomainWebId };
    await expect(handler.handle({ accountId, json } as any)).resolves.toEqual({
      json: { resource, webId: subdomainWebId, oidcIssuer: baseUrl },
    });
    expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(0);
    expect(webIdStore.create).toHaveBeenLastCalledWith(subdomainWebId, accountId);
  });

  it('does not treat a pod with a shared prefix as the owner.', async(): Promise<void> => {
    const foreignWebId = 'http://example.com/alice-evil/profile/card#me';
    podStore.findPods.mockResolvedValueOnce([{ id: podId, baseUrl: 'http://example.com/alice/' }]);
    json = { webId: foreignWebId };
    await expect(handler.handle({ accountId, json } as any)).resolves.toEqual({
      json: { resource, webId: foreignWebId, oidcIssuer: baseUrl },
    });
    expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
  });

  it('throws an error if the WebID is already registered to this account.', async(): Promise<void> => {
    webIdStore.isLinked.mockResolvedValueOnce(true);
    await expect(handler.handle({ accountId, json } as any)).rejects.toThrow(BadRequestHttpError);
    expect(webIdStore.isLinked).toHaveBeenCalledTimes(1);
    expect(webIdStore.isLinked).toHaveBeenLastCalledWith(webId, accountId);
    expect(podStore.findPods).toHaveBeenCalledTimes(0);
    expect(webIdStore.create).toHaveBeenCalledTimes(0);
  });

  it('calls the ownership validator if the WebID is not in a pod of the account.', async(): Promise<void> => {
    podStore.findPods.mockResolvedValueOnce([{ id: podId, baseUrl: 'http://example.com/other/' }]);
    await expect(handler.handle({ accountId, json } as any)).resolves.toEqual({
      json: { resource, webId, oidcIssuer: baseUrl },
    });
    expect(webIdStore.isLinked).toHaveBeenCalledTimes(1);
    expect(webIdStore.isLinked).toHaveBeenLastCalledWith(webId, accountId);
    expect(podStore.findPods).toHaveBeenCalledTimes(1);
    expect(podStore.findPods).toHaveBeenLastCalledWith(accountId);
    expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
    expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
    expect(webIdStore.create).toHaveBeenCalledTimes(1);
    expect(webIdStore.create).toHaveBeenLastCalledWith(webId, accountId);
  });
});
