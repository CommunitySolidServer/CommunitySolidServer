import type { Account } from '../../../../../../src/identity/interaction/account/util/Account';
import { BaseAccountStore } from '../../../../../../src/identity/interaction/account/util/BaseAccountStore';
import type { ExpiringStorage } from '../../../../../../src/storage/keyvalue/ExpiringStorage';
import { NotFoundHttpError } from '../../../../../../src/util/errors/NotFoundHttpError';
import { createAccount } from '../../../../../util/AccountUtil';

jest.mock('uuid', (): any => ({ v4: (): string => '4c9b88c1-7502-4107-bb79-2a3a590c7aa3' }));

describe('A BaseAccountStore', (): void => {
  let account: Account;
  let storage: jest.Mocked<ExpiringStorage<string, Account>>;
  let store: BaseAccountStore;

  beforeEach(async(): Promise<void> => {
    account = createAccount('4c9b88c1-7502-4107-bb79-2a3a590c7aa3');

    storage = {
      get: jest.fn().mockResolvedValue(account),
      set: jest.fn(),
    } as any;

    store = new BaseAccountStore(storage);
  });

  it('creates an empty account.', async(): Promise<void> => {
    await expect(store.create()).resolves.toEqual(account);
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenLastCalledWith(account.id, account, 30 * 60 * 1000);
  });

  it('stores the new data when updating.', async(): Promise<void> => {
    // This line is here just for 100% coverage
    account.logins.empty = undefined;
    account.logins.method = { key: 'value' };
    await expect(store.update(account)).resolves.toBeUndefined();
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenLastCalledWith(account.id, account);
  });

  it('errors when trying to update without login methods.', async(): Promise<void> => {
    await expect(store.update(account)).rejects.toThrow('An account needs at least 1 login method.');
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith(account.id);
    expect(storage.set).toHaveBeenCalledTimes(0);
  });

  it('throws a 404 if the account is not known when updating.', async(): Promise<void> => {
    storage.get.mockResolvedValueOnce(undefined);
    await expect(store.update(account)).rejects.toThrow(NotFoundHttpError);
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith(account.id);
    expect(storage.set).toHaveBeenCalledTimes(0);
  });
});
