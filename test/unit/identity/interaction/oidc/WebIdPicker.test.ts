import type { Account } from '../../../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../../../src/identity/interaction/account/util/AccountStore';
import type { Interaction } from '../../../../../src/identity/interaction/InteractionHandler';
import { WebIdPicker } from '../../../../../src/identity/interaction/oidc/WebIdPicker';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';
import { FoundHttpError } from '../../../../../src/util/errors/FoundHttpError';
import { createAccount, mockAccountStore } from '../../../../util/AccountUtil';

describe('A WebIdPicker', (): void => {
  const accountId = 'accountId';
  const webId1 = 'http://example.com/.account/card1#me';
  const webId2 = 'http://example.com/.account/card2#me';
  let json: unknown;
  let oidcInteraction: Interaction;
  let account: Account;
  let accountStore: jest.Mocked<AccountStore>;
  let picker: WebIdPicker;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = {
      lastSubmission: { login: { accountId: 'id' }},
      save: jest.fn(),
      returnTo: 'returnTo',
    } as any;

    json = {
      webId: webId1,
    };

    account = createAccount(accountId);
    account.webIds[webId1] = 'resource';
    account.webIds[webId2] = 'resource';

    accountStore = mockAccountStore(account);

    picker = new WebIdPicker(accountStore);
  });

  it('requires a WebID as input and returns the available WebIDs.', async(): Promise<void> => {
    await expect(picker.getView({ accountId } as any)).resolves.toEqual({
      json: {
        fields: {
          webId: {
            required: true,
            type: 'string',
          },
          remember: {
            required: false,
            type: 'boolean',
          },
        },
        webIds: [
          webId1,
          webId2,
        ],
      },
    });
  });

  it('allows users to pick a WebID.', async(): Promise<void> => {
    const result = picker.handle({ oidcInteraction, accountId, json } as any);
    await expect(result).rejects.toThrow(FoundHttpError);
    await expect(result).rejects.toEqual(expect.objectContaining({ location: oidcInteraction.returnTo }));

    expect(oidcInteraction.save).toHaveBeenCalledTimes(1);
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
    json = { webId: 'http://example.com/somewhere/else#me' };
    await expect(picker.handle({ oidcInteraction, accountId, json } as any))
      .rejects.toThrow('WebID does not belong to this account.');
  });
});
