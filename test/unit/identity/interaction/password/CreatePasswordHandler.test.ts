import type { Account } from '../../../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../../../src/identity/interaction/account/util/AccountStore';
import { CreatePasswordHandler } from '../../../../../src/identity/interaction/password/CreatePasswordHandler';
import type { PasswordIdRoute } from '../../../../../src/identity/interaction/password/util/PasswordIdRoute';
import { PASSWORD_METHOD } from '../../../../../src/identity/interaction/password/util/PasswordStore';
import type { PasswordStore } from '../../../../../src/identity/interaction/password/util/PasswordStore';
import { createAccount, mockAccountStore } from '../../../../util/AccountUtil';

describe('A CreatePasswordHandler', (): void => {
  const email = 'example@example.com';
  const password = 'supersecret!';
  const resource = 'http://example.com/foo';
  let account: Account;
  let json: unknown;
  let passwordStore: jest.Mocked<PasswordStore>;
  let accountStore: jest.Mocked<AccountStore>;
  let passwordRoute: PasswordIdRoute;
  let handler: CreatePasswordHandler;

  beforeEach(async(): Promise<void> => {
    json = { email, password };

    passwordStore = {
      create: jest.fn(),
      confirmVerification: jest.fn(),
      delete: jest.fn(),
    } as any;

    account = createAccount();
    accountStore = mockAccountStore(account);

    passwordRoute = {
      getPath: jest.fn().mockReturnValue(resource),
      matchPath: jest.fn().mockReturnValue(true),
    };

    handler = new CreatePasswordHandler(passwordStore, accountStore, passwordRoute);
  });

  it('requires specific input fields.', async(): Promise<void> => {
    await expect(handler.getView()).resolves.toEqual({
      json: {
        fields: {
          email: {
            required: true,
            type: 'string',
          },
          password: {
            required: true,
            type: 'string',
          },
        },
      },
    });
  });

  it('returns the resource URL of the created login.', async(): Promise<void> => {
    await expect(handler.handle({ accountId: account.id, json } as any)).resolves.toEqual({ json: { resource }});
    expect(passwordStore.create).toHaveBeenCalledTimes(1);
    expect(passwordStore.create).toHaveBeenLastCalledWith(email, account.id, password);
    expect(passwordStore.confirmVerification).toHaveBeenCalledTimes(1);
    expect(passwordStore.confirmVerification).toHaveBeenLastCalledWith(email);
    expect(accountStore.update).toHaveBeenCalledTimes(1);
    expect(accountStore.update).toHaveBeenLastCalledWith(account);
    expect(account.logins[PASSWORD_METHOD]?.[email]).toBe(resource);
    expect(passwordStore.delete).toHaveBeenCalledTimes(0);
  });

  it('throws an error if the account already has a login with this email address.', async(): Promise<void> => {
    await handler.handle({ accountId: account.id, json } as any);
    jest.clearAllMocks();
    await expect(handler.handle({ accountId: account.id, json } as any))
      .rejects.toThrow('This account already has a login method for this e-mail address.');
    expect(passwordStore.create).toHaveBeenCalledTimes(0);
    expect(accountStore.update).toHaveBeenCalledTimes(0);
  });

  it('reverts changes if there is an error writing the data.', async(): Promise<void> => {
    const error = new Error('bad data');
    accountStore.update.mockRejectedValueOnce(error);
    await expect(handler.handle({ accountId: account.id, json } as any)).rejects.toThrow(error);
    expect(passwordStore.create).toHaveBeenCalledTimes(1);
    expect(passwordStore.create).toHaveBeenLastCalledWith(email, account.id, password);
    expect(passwordStore.confirmVerification).toHaveBeenCalledTimes(1);
    expect(passwordStore.confirmVerification).toHaveBeenLastCalledWith(email);
    expect(accountStore.update).toHaveBeenCalledTimes(1);
    expect(accountStore.update).toHaveBeenLastCalledWith(account);
    expect(passwordStore.delete).toHaveBeenCalledTimes(1);
    expect(passwordStore.delete).toHaveBeenLastCalledWith(email);
  });
});
