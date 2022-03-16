import { AccountDetailsHandler } from '../../../../../src/identity/interaction/account/AccountDetailsHandler';
import type { AccountStore } from '../../../../../src/identity/interaction/account/util/AccountStore';
import { createAccount, mockAccountStore } from '../../../../util/AccountUtil';

describe('An AccountDetailsHandler', (): void => {
  const accountId = 'id';
  const account = createAccount();
  let accountStore: jest.Mocked<AccountStore>;
  let handler: AccountDetailsHandler;

  beforeEach(async(): Promise<void> => {
    accountStore = mockAccountStore(account);

    handler = new AccountDetailsHandler(accountStore);
  });

  it('returns a JSON representation of the account.', async(): Promise<void> => {
    await expect(handler.handle({ accountId } as any)).resolves.toEqual({ json: account });
  });
});
