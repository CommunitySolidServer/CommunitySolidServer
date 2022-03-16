import type { Account } from '../../../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../../../src/identity/interaction/account/util/AccountStore';
import { UpdatePasswordHandler } from '../../../../../src/identity/interaction/password/UpdatePasswordHandler';
import { PASSWORD_METHOD } from '../../../../../src/identity/interaction/password/util/PasswordStore';
import type { PasswordStore } from '../../../../../src/identity/interaction/password/util/PasswordStore';
import { createAccount, mockAccountStore } from '../../../../util/AccountUtil';

describe('An UpdatePasswordHandler', (): void => {
  let account: Account;
  let json: unknown;
  const email = 'email@example.com';
  const target = { path: 'http://example.com/.account/password' };
  const oldPassword = 'oldPassword!';
  const newPassword = 'newPassword!';
  let accountStore: jest.Mocked<AccountStore>;
  let passwordStore: jest.Mocked<PasswordStore>;
  let handler: UpdatePasswordHandler;

  beforeEach(async(): Promise<void> => {
    json = { oldPassword, newPassword };

    account = createAccount();
    account.logins[PASSWORD_METHOD] = { [email]: target.path };
    accountStore = mockAccountStore(account);

    passwordStore = {
      authenticate: jest.fn(),
      update: jest.fn(),
    } as any;

    handler = new UpdatePasswordHandler(accountStore, passwordStore);
  });

  it('requires specific input fields.', async(): Promise<void> => {
    await expect(handler.getView()).resolves.toEqual({
      json: {
        fields: {
          oldPassword: {
            required: true,
            type: 'string',
          },
          newPassword: {
            required: true,
            type: 'string',
          },
        },
      },
    });
  });

  it('updates the password.', async(): Promise<void> => {
    await expect(handler.handle({ json, accountId: account.id, target } as any)).resolves.toEqual({ json: {}});
    expect(passwordStore.authenticate).toHaveBeenCalledTimes(1);
    expect(passwordStore.authenticate).toHaveBeenLastCalledWith(email, oldPassword);
    expect(passwordStore.update).toHaveBeenCalledTimes(1);
    expect(passwordStore.update).toHaveBeenLastCalledWith(email, newPassword);
  });

  it('errors if authentication fails.', async(): Promise<void> => {
    passwordStore.authenticate.mockRejectedValueOnce(new Error('bad data'));
    await expect(handler.handle({ json, accountId: account.id, target } as any))
      .rejects.toThrow('Old password is invalid.');
    expect(passwordStore.authenticate).toHaveBeenCalledTimes(1);
    expect(passwordStore.authenticate).toHaveBeenLastCalledWith(email, oldPassword);
    expect(passwordStore.update).toHaveBeenCalledTimes(0);
  });
});
