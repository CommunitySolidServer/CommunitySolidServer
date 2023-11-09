import { ACCOUNT_SETTINGS_REMEMBER_LOGIN } from '../../../../../../src/identity/interaction/account/util/AccountStore';
import { BaseAccountStore } from '../../../../../../src/identity/interaction/account/util/BaseAccountStore';
import type {
  AccountLoginStorage,
} from '../../../../../../src/identity/interaction/account/util/LoginStorage';
import {
  ACCOUNT_TYPE,
} from '../../../../../../src/identity/interaction/account/util/LoginStorage';
import { InternalServerError } from '../../../../../../src/util/errors/InternalServerError';

jest.mock('uuid', (): any => ({ v4: (): string => '4c9b88c1-7502-4107-bb79-2a3a590c7aa3' }));

describe('A BaseAccountStore', (): void => {
  const id = 'id';
  let storage: jest.Mocked<AccountLoginStorage<any>>;
  let store: BaseAccountStore;

  beforeEach(async(): Promise<void> => {
    storage = {
      defineType: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ id }),
      get: jest.fn().mockResolvedValue({ id, [ACCOUNT_SETTINGS_REMEMBER_LOGIN]: true }),
      setField: jest.fn(),
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

  it('can only initialize once.', async(): Promise<void> => {
    await expect(store.handle()).resolves.toBeUndefined();
    await expect(store.handle()).resolves.toBeUndefined();
    expect(storage.defineType).toHaveBeenCalledTimes(1);
  });

  it('throws an error if defining the type goes wrong.', async(): Promise<void> => {
    storage.defineType.mockRejectedValueOnce(new Error('bad data'));
    await expect(store.handle()).rejects.toThrow(InternalServerError);
  });

  it('creates an empty account.', async(): Promise<void> => {
    await expect(store.create()).resolves.toEqual(id);
    expect(storage.create).toHaveBeenCalledTimes(1);
    expect(storage.create).toHaveBeenLastCalledWith(ACCOUNT_TYPE, {});
  });

  it('can return a setting.', async(): Promise<void> => {
    await expect(store.getSetting(id, ACCOUNT_SETTINGS_REMEMBER_LOGIN)).resolves.toBe(true);
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith(ACCOUNT_TYPE, id);
  });

  it('returns undefined if the accountId is invalid.', async(): Promise<void> => {
    storage.get.mockResolvedValueOnce(undefined);
    await expect(store.getSetting(id, ACCOUNT_SETTINGS_REMEMBER_LOGIN)).resolves.toBeUndefined();
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith(ACCOUNT_TYPE, id);
  });

  it('can set the settings.', async(): Promise<void> => {
    await expect(store.updateSetting(id, ACCOUNT_SETTINGS_REMEMBER_LOGIN, true)).resolves.toBeUndefined();
    expect(storage.setField).toHaveBeenCalledTimes(1);
    expect(storage.setField).toHaveBeenLastCalledWith(ACCOUNT_TYPE, id, ACCOUNT_SETTINGS_REMEMBER_LOGIN, true);
  });
});
