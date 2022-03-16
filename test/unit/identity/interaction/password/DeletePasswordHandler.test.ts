import type { Account } from '../../../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../../../src/identity/interaction/account/util/AccountStore';

import { DeletePasswordHandler } from '../../../../../src/identity/interaction/password/DeletePasswordHandler';
import { PASSWORD_METHOD } from '../../../../../src/identity/interaction/password/util/PasswordStore';
import type { PasswordStore } from '../../../../../src/identity/interaction/password/util/PasswordStore';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';
import { createAccount, mockAccountStore } from '../../../../util/AccountUtil';

describe('A DeletePasswordHandler', (): void => {
  const accountId = 'accountId';
  const email = 'example@example.com';
  const target = { path: 'http://example.com/.account/password' };
  let accountStore: jest.Mocked<AccountStore>;
  let passwordStore: jest.Mocked<PasswordStore>;
  let handler: DeletePasswordHandler;

  beforeEach(async(): Promise<void> => {
    accountStore = mockAccountStore();
    accountStore.get.mockImplementation(async(id: string): Promise<Account> => {
      const account = createAccount(id);
      account.logins[PASSWORD_METHOD] = { [email]: target.path };
      return account;
    });

    passwordStore = {
      delete: jest.fn(),
    } as any;

    handler = new DeletePasswordHandler(accountStore, passwordStore);
  });

  it('deletes the token.', async(): Promise<void> => {
    await expect(handler.handle({ target, accountId } as any)).resolves.toEqual({ json: {}});
    // Once to find initial account and once for backup during `safeUpdate`
    expect(accountStore.get).toHaveBeenCalledTimes(2);
    expect(accountStore.get).toHaveBeenNthCalledWith(1, accountId);
    expect(accountStore.get).toHaveBeenNthCalledWith(2, accountId);
    expect(accountStore.update).toHaveBeenCalledTimes(1);
    const account: Account = await accountStore.get.mock.results[0].value;
    expect(accountStore.update).toHaveBeenLastCalledWith(account);
    expect(account.logins[PASSWORD_METHOD]![email]).toBeUndefined();
    expect(passwordStore.delete).toHaveBeenCalledTimes(1);
    expect(passwordStore.delete).toHaveBeenLastCalledWith(email);
  });

  it('throws a 404 if there are no logins.', async(): Promise<void> => {
    accountStore.get.mockResolvedValueOnce(createAccount());
    await expect(handler.handle({ target, accountId } as any)).rejects.toThrow(NotFoundHttpError);
    expect(accountStore.get).toHaveBeenCalledTimes(1);
    expect(accountStore.get).toHaveBeenLastCalledWith(accountId);
    expect(accountStore.update).toHaveBeenCalledTimes(0);
    expect(passwordStore.delete).toHaveBeenCalledTimes(0);
  });

  it('throws a 404 if there is no such token.', async(): Promise<void> => {
    const account = createAccount(accountId);
    account.logins[PASSWORD_METHOD] = {};
    accountStore.get.mockResolvedValueOnce(account);
    await expect(handler.handle({ target, accountId } as any)).rejects.toThrow(NotFoundHttpError);
    expect(accountStore.get).toHaveBeenCalledTimes(1);
    expect(accountStore.get).toHaveBeenLastCalledWith(accountId);
    expect(accountStore.update).toHaveBeenCalledTimes(0);
    expect(passwordStore.delete).toHaveBeenCalledTimes(0);
  });

  it('reverts the changes if there was a data error.', async(): Promise<void> => {
    const error = new Error('bad data');
    passwordStore.delete.mockRejectedValueOnce(error);
    await expect(handler.handle({ target, accountId } as any)).rejects.toThrow(error);
    expect(accountStore.get).toHaveBeenCalledTimes(2);
    expect(accountStore.get).toHaveBeenNthCalledWith(1, accountId);
    expect(accountStore.get).toHaveBeenNthCalledWith(2, accountId);
    expect(accountStore.update).toHaveBeenCalledTimes(2);
    expect(accountStore.update).toHaveBeenNthCalledWith(1, await accountStore.get.mock.results[0].value);
    expect(accountStore.update).toHaveBeenNthCalledWith(2, expect.objectContaining({
      logins: { [PASSWORD_METHOD]: { [email]: target.path }},
    }));
    expect(passwordStore.delete).toHaveBeenCalledTimes(1);
    expect(passwordStore.delete).toHaveBeenLastCalledWith(email);
  });
});
