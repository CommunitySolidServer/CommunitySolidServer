import { BasePodCreator } from '../../../../../../src/identity/interaction/pod/util/BasePodCreator';
import type { PodStore } from '../../../../../../src/identity/interaction/pod/util/PodStore';
import type { WebIdStore } from '../../../../../../src/identity/interaction/webid/util/WebIdStore';
import type { IdentifierGenerator } from '../../../../../../src/pods/generate/IdentifierGenerator';

describe('A BasePodCreator', (): void => {
  const name = 'name';
  const webId = 'http://example.com/other/webId#me';
  const accountId = 'accountId';
  const podId = 'podId';
  const webIdLink = 'webIdLink';
  const baseUrl = 'http://example.com/';
  const relativeWebIdPath = '/profile/card#me';
  const podUrl = 'http://example.com/name/';
  const generatedWebId = 'http://example.com/name/profile/card#me';
  let identifierGenerator: jest.Mocked<IdentifierGenerator>;
  let webIdStore: jest.Mocked<WebIdStore>;
  let podStore: jest.Mocked<PodStore>;
  let creator: BasePodCreator;

  beforeEach(async(): Promise<void> => {
    identifierGenerator = {
      generate: jest.fn().mockReturnValue({ path: podUrl }),
      extractPod: jest.fn(),
    };

    webIdStore = {
      isLinked: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(webIdLink),
      delete: jest.fn(),
    } satisfies Partial<WebIdStore> as any;

    podStore = {
      create: jest.fn().mockResolvedValue(podId),
      findPods: jest.fn().mockResolvedValue([{ id: podId, baseUrl: podUrl }]),
    } satisfies Partial<PodStore> as any;

    creator = new BasePodCreator({
      webIdStore,
      podStore,
      baseUrl,
      relativeWebIdPath,
      identifierGenerator,
    });
  });

  it('generates a pod and WebID.', async(): Promise<void> => {
    await expect(creator.handle({ accountId, name })).resolves
      .toEqual({ podUrl, webId: generatedWebId, podId, webIdLink });
    expect(webIdStore.isLinked).toHaveBeenCalledTimes(1);
    expect(webIdStore.isLinked).toHaveBeenLastCalledWith(generatedWebId, accountId);
    expect(webIdStore.create).toHaveBeenCalledTimes(1);
    expect(webIdStore.create).toHaveBeenLastCalledWith(generatedWebId, accountId);
    expect(podStore.create).toHaveBeenCalledTimes(1);
    expect(podStore.create).toHaveBeenLastCalledWith(accountId, {
      base: { path: podUrl },
      webId: generatedWebId,
      oidcIssuer: baseUrl,
    }, false);
  });

  it('can use an external WebID for the pod generation.', async(): Promise<void> => {
    await expect(creator.handle({ accountId, name, webId })).resolves.toEqual({ podUrl, webId, podId });
    expect(webIdStore.isLinked).toHaveBeenCalledTimes(0);
    expect(webIdStore.create).toHaveBeenCalledTimes(0);
    expect(podStore.create).toHaveBeenCalledTimes(1);
    expect(podStore.create).toHaveBeenLastCalledWith(accountId, {
      base: { path: podUrl },
      webId,
    }, false);
  });

  it('create a root pod.', async(): Promise<void> => {
    await expect(creator.handle({ accountId, webId })).resolves.toEqual({ podUrl: baseUrl, webId, podId });
    expect(webIdStore.isLinked).toHaveBeenCalledTimes(0);
    expect(webIdStore.create).toHaveBeenCalledTimes(0);
    expect(podStore.create).toHaveBeenCalledTimes(1);
    expect(podStore.create).toHaveBeenLastCalledWith(accountId, {
      base: { path: baseUrl },
      webId,
    }, true);
  });

  it('errors if the account is already linked to the WebID that would be generated.', async(): Promise<void> => {
    webIdStore.isLinked.mockResolvedValueOnce(true);
    await expect(creator.handle({ name, accountId }))
      .rejects.toThrow(`${generatedWebId} is already registered to this account.`);
    expect(webIdStore.isLinked).toHaveBeenCalledTimes(1);
    expect(webIdStore.isLinked).toHaveBeenLastCalledWith(generatedWebId, accountId);
    expect(webIdStore.create).toHaveBeenCalledTimes(0);
    expect(podStore.create).toHaveBeenCalledTimes(0);
  });

  it('undoes any changes if something goes wrong creating the pod.', async(): Promise<void> => {
    const error = new Error('bad data');
    podStore.create.mockRejectedValueOnce(error);

    await expect(creator.handle({ name, accountId })).rejects.toBe(error);

    expect(webIdStore.create).toHaveBeenCalledTimes(1);
    expect(webIdStore.create).toHaveBeenLastCalledWith(generatedWebId, accountId);
    expect(podStore.create).toHaveBeenCalledTimes(1);
    expect(podStore.create).toHaveBeenLastCalledWith(accountId, {
      base: { path: podUrl },
      webId: generatedWebId,
      oidcIssuer: baseUrl,
    }, false);
    expect(webIdStore.delete).toHaveBeenCalledTimes(1);
    expect(webIdStore.delete).toHaveBeenLastCalledWith(webIdLink);
  });
});
