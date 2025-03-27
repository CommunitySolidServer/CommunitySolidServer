import { ACCOUNT_SETTINGS_REMEMBER_LOGIN } from '../../../../../../src/identity/interaction/account/util/AccountStore';
import { BaseAccountStore } from '../../../../../../src/identity/interaction/account/util/BaseAccountStore';
import type {
  AccountLoginStorage,
} from '../../../../../../src/identity/interaction/account/util/LoginStorage';
import {
  ACCOUNT_TYPE,
} from '../../../../../../src/identity/interaction/account/util/LoginStorage';

describe('A BaseAccountStore', (): void => {
  let storage: jest.Mocked<AccountLoginStorage<any>>;
  let store: BaseAccountStore;

  beforeEach(async(): Promise<void> => {
    storage = {
      defineType: jest.fn().mockResolvedValue({}),
    } satisfies Partial<AccountLoginStorage<any>> as any;

    store = new BaseAccountStore(storage);
  });

  it('defines the account type in the storage.', async(): Promise<void> => {
    await expect(store.handle()).resolves.toBeUndefined();
    expect(storage.defineType).toHaveBeenCalledTimes(1);
    expect(storage.defineType).toHaveBeenLastCalledWith(ACCOUNT_TYPE, {
      [ACCOUNT_SETTINGS_REMEMBER_LOGIN]: 'boolean?',
    }, false);
  });
});
