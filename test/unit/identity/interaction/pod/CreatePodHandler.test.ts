import type { Account } from '../../../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../../../src/identity/interaction/account/util/AccountStore';
import { CreatePodHandler } from '../../../../../src/identity/interaction/pod/CreatePodHandler';
import type { PodStore } from '../../../../../src/identity/interaction/pod/util/PodStore';
import type { WebIdStore } from '../../../../../src/identity/interaction/webid/util/WebIdStore';
import type { IdentifierGenerator } from '../../../../../src/pods/generate/IdentifierGenerator';
import { createAccount, mockAccountStore } from '../../../../util/AccountUtil';

describe('A CreatePodHandler', (): void => {
  const name = 'name';
  const webId = 'http://example.com/other/webId#me';
  const accountId = 'accountId';
  let json: unknown;
  const baseUrl = 'http://example.com/';
  const relativeWebIdPath = '/profile/card#me';
  const podUrl = 'http://example.com/name/';
  const generatedWebId = 'http://example.com/name/profile/card#me';
  const webIdResource = 'http://example.com/.account/webID';
  const podResource = 'http://example.com/.account/pod';
  let identifierGenerator: jest.Mocked<IdentifierGenerator>;
  let accountStore: jest.Mocked<AccountStore>;
  let webIdStore: jest.Mocked<WebIdStore>;
  let podStore: jest.Mocked<PodStore>;
  let handler: CreatePodHandler;

  beforeEach(async(): Promise<void> => {
    json = {
      name,
    };

    identifierGenerator = {
      generate: jest.fn().mockReturnValue({ path: podUrl }),
      extractPod: jest.fn(),
    };

    accountStore = mockAccountStore();
    accountStore.get.mockImplementation(async(id: string): Promise<Account> => createAccount(id));

    webIdStore = {
      get: jest.fn(),
      add: jest.fn().mockResolvedValue(webIdResource),
      delete: jest.fn(),
    };

    podStore = {
      create: jest.fn().mockResolvedValue(podResource),
    };

    handler = new CreatePodHandler(
      { accountStore, webIdStore, podStore, baseUrl, relativeWebIdPath, identifierGenerator, allowRoot: false },
    );
  });

  it('requires specific input fields.', async(): Promise<void> => {
    await expect(handler.getView()).resolves.toEqual({
      json: {
        fields: {
          name: {
            required: true,
            type: 'string',
          },
          settings: {
            required: false,
            type: 'object',
            fields: {
              webId: {
                required: false,
                type: 'string',
              },
            },
          },
        },
      },
    });
  });

  it('generates a pod and WebID.', async(): Promise<void> => {
    await expect(handler.handle({ json, accountId } as any)).resolves.toEqual({ json: {
      pod: podUrl, webId: generatedWebId, podResource, webIdResource,
    }});
    expect(webIdStore.add).toHaveBeenCalledTimes(1);
    expect(webIdStore.add).toHaveBeenLastCalledWith(generatedWebId, await accountStore.get.mock.results[0].value);
    expect(podStore.create).toHaveBeenCalledTimes(1);
    expect(podStore.create).toHaveBeenLastCalledWith(await accountStore.get.mock.results[0].value, {
      base: { path: podUrl },
      webId: generatedWebId,
      oidcIssuer: baseUrl,
    }, false);
  });

  it('can use an external WebID for the pod generation.', async(): Promise<void> => {
    json = { name, settings: { webId }};

    await expect(handler.handle({ json, accountId } as any)).resolves.toEqual({ json: {
      pod: podUrl, webId, podResource,
    }});
    expect(webIdStore.add).toHaveBeenCalledTimes(0);
    expect(podStore.create).toHaveBeenCalledTimes(1);
    expect(podStore.create).toHaveBeenLastCalledWith(await accountStore.get.mock.results[0].value, {
      base: { path: podUrl },
      webId,
    }, false);
  });

  it('errors if the account is already linked to the WebID that would be generated.', async(): Promise<void> => {
    const account = createAccount();
    account.webIds[generatedWebId] = 'http://example.com/resource';
    accountStore.get.mockResolvedValueOnce(account);
    await expect(handler.handle({ json, accountId } as any))
      .rejects.toThrow(`${generatedWebId} is already registered to this account.`);
    expect(webIdStore.add).toHaveBeenCalledTimes(0);
    expect(podStore.create).toHaveBeenCalledTimes(0);
  });

  it('undoes any changes if something goes wrong creating the pod.', async(): Promise<void> => {
    const error = new Error('bad data');
    podStore.create.mockRejectedValueOnce(error);

    await expect(handler.handle({ json, accountId } as any)).rejects.toBe(error);

    expect(webIdStore.add).toHaveBeenCalledTimes(1);
    expect(webIdStore.add).toHaveBeenLastCalledWith(generatedWebId, await accountStore.get.mock.results[0].value);
    expect(podStore.create).toHaveBeenCalledTimes(1);
    expect(podStore.create).toHaveBeenLastCalledWith(await accountStore.get.mock.results[0].value, {
      base: { path: podUrl },
      webId: generatedWebId,
      oidcIssuer: baseUrl,
    }, false);
    expect(webIdStore.delete).toHaveBeenCalledTimes(1);
    expect(webIdStore.add).toHaveBeenLastCalledWith(generatedWebId, await accountStore.get.mock.results[1].value);
  });

  describe('allowing root pods', (): void => {
    beforeEach(async(): Promise<void> => {
      handler = new CreatePodHandler(
        { accountStore, webIdStore, podStore, baseUrl, relativeWebIdPath, identifierGenerator, allowRoot: true },
      );
    });

    it('does not require a name.', async(): Promise<void> => {
      await expect(handler.getView()).resolves.toEqual({
        json: {
          fields: {
            name: {
              required: false,
              type: 'string',
            },
            settings: {
              required: false,
              type: 'object',
              fields: {
                webId: {
                  required: false,
                  type: 'string',
                },
              },
            },
          },
        },
      });
    });

    it('generates a pod and WebID in the root.', async(): Promise<void> => {
      await expect(handler.handle({ json: {}, accountId } as any)).resolves.toEqual({ json: {
        pod: baseUrl, webId: `${baseUrl}profile/card#me`, podResource, webIdResource,
      }});
      expect(webIdStore.add).toHaveBeenCalledTimes(1);
      expect(webIdStore.add)
        .toHaveBeenLastCalledWith(`${baseUrl}profile/card#me`, await accountStore.get.mock.results[0].value);
      expect(podStore.create).toHaveBeenCalledTimes(1);
      expect(podStore.create).toHaveBeenLastCalledWith(await accountStore.get.mock.results[0].value, {
        base: { path: baseUrl },
        webId: `${baseUrl}profile/card#me`,
        oidcIssuer: baseUrl,
      }, true);
    });
  });
});
