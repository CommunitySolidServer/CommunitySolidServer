import { CreateAccountHandler } from '../../../../../src/identity/interaction/account/CreateAccountHandler';
import type { AccountStore } from '../../../../../src/identity/interaction/account/util/AccountStore';

describe('A CreateAccountHandler', (): void => {
  const accountId = 'accountId';
  let accountStore: jest.Mocked<AccountStore>;
  let handler: CreateAccountHandler;

  beforeEach(async(): Promise<void> => {
    accountStore = {
      create: jest.fn().mockResolvedValue(accountId),
    } satisfies Partial<AccountStore> as any;

    handler = new CreateAccountHandler(accountStore, {} as any);
  });

  it('has no requirements.', async(): Promise<void> => {
    await expect(handler.getView()).resolves.toEqual({ json: {}});
  });

  it('returns the identifier of the newly created account.', async(): Promise<void> => {
    await expect(handler.login()).resolves.toEqual({ json: { accountId }});
    expect(accountStore.create).toHaveBeenCalledTimes(1);
  });
});
