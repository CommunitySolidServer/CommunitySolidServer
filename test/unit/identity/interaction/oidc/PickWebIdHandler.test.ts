import type { ProviderFactory } from '../../../../../src/identity/configuration/ProviderFactory';
import type { Interaction } from '../../../../../src/identity/interaction/InteractionHandler';
import { PickWebIdHandler } from '../../../../../src/identity/interaction/oidc/PickWebIdHandler';
import type { WebIdStore } from '../../../../../src/identity/interaction/webid/util/WebIdStore';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';
import { FoundHttpError } from '../../../../../src/util/errors/FoundHttpError';
import type Provider from '../../../../../templates/types/oidc-provider';

describe('A PickWebIdHandler', (): void => {
  const accountId = 'accountId';
  const webId1 = 'http://example.com/.account/card1#me';
  const webId2 = 'http://example.com/.account/card2#me';
  let json: unknown;
  let oidcInteraction: Interaction;
  let store: jest.Mocked<WebIdStore>;
  let provider: jest.Mocked<Provider>;
  let providerFactory: jest.Mocked<ProviderFactory>;
  let picker: PickWebIdHandler;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = {
      lastSubmission: { login: { accountId: 'id' }},
      persist: jest.fn(),
      session: { cookie: 'cookie' },
      returnTo: 'returnTo',
    } as any;

    json = {
      webId: webId1,
    };

    store = {
      findLinks: jest.fn().mockResolvedValue([{ id: 'id', webId: webId1 }, { id: 'id2', webId: webId2 }]),
      isLinked: jest.fn().mockResolvedValue(true),
    } satisfies Partial<WebIdStore> as any;

    provider = {
      Session: {
        find: jest.fn().mockResolvedValue({ persist: jest.fn() }),
      },
    } as any;

    providerFactory = {
      getProvider: jest.fn().mockResolvedValue(provider),
    };

    picker = new PickWebIdHandler(store, providerFactory);
  });

  it('requires a WebID as input and returns the available WebIDs.', async(): Promise<void> => {
    await expect(picker.getView({ accountId } as any)).resolves.toEqual({
      json: {
        fields: {
          webId: { required: true, type: 'string' },
          remember: { required: false, type: 'boolean' },
        },
        webIds: [ webId1, webId2 ],
      },
    });
    expect(store.findLinks).toHaveBeenCalledTimes(1);
    expect(store.findLinks).toHaveBeenLastCalledWith(accountId);
  });

  it('allows users to pick a WebID.', async(): Promise<void> => {
    const result = picker.handle({ oidcInteraction, accountId, json } as any);
    await expect(result).rejects.toThrow(FoundHttpError);
    await expect(result).rejects.toEqual(expect.objectContaining({ location: oidcInteraction.returnTo }));

    expect(store.isLinked).toHaveBeenCalledTimes(1);
    expect(store.isLinked).toHaveBeenLastCalledWith(webId1, accountId);
    // eslint-disable-next-line jest/unbound-method
    expect((await jest.mocked(provider.Session.find).mock.results[0].value).persist).toHaveBeenCalledTimes(1);
    expect(oidcInteraction.persist).toHaveBeenCalledTimes(1);
    expect(oidcInteraction.result).toEqual({
      login: {
        accountId: webId1,
        remember: false,
      },
    });
  });

  it('errors if there is no OIDC interaction.', async(): Promise<void> => {
    await expect(picker.handle({ accountId, json } as any)).rejects.toThrow(BadRequestHttpError);
  });

  it('errors if the WebID is not part of the account.', async(): Promise<void> => {
    store.isLinked.mockResolvedValueOnce(false);
    await expect(picker.handle({ oidcInteraction, accountId, json } as any))
      .rejects.toThrow('WebID does not belong to this account.');
    expect(store.isLinked).toHaveBeenCalledTimes(1);
    expect(store.isLinked).toHaveBeenLastCalledWith(webId1, accountId);
    expect(oidcInteraction.persist).toHaveBeenCalledTimes(0);
  });
});
