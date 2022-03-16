import { CreateAccountHandler } from '../../../../../src/identity/interaction/account/CreateAccountHandler';
import type { AccountStore } from '../../../../../src/identity/interaction/account/util/AccountStore';
import { createAccount, mockAccountStore } from '../../../../util/AccountUtil';

describe('A CreateAccountHandler', (): void => {
  let accountStore: jest.Mocked<AccountStore>;
  let handler: CreateAccountHandler;

  beforeEach(async(): Promise<void> => {
    accountStore = mockAccountStore();
    handler = new CreateAccountHandler(accountStore, {} as any, {} as any);
  });

  it('has no requirements.', async(): Promise<void> => {
    await expect(handler.getView()).resolves.toEqual({ json: {}});
  });

  it('returns the identifier of the newly created account.', async(): Promise<void> => {
    const account = createAccount('custom');
    accountStore.create.mockResolvedValueOnce(account);
    await expect(handler.login()).resolves.toEqual({ json: { accountId: 'custom' }});
  });
});
