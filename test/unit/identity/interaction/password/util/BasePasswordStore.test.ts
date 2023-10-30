import { hash } from 'bcryptjs';
import type {
  AccountLoginStorage,
} from '../../../../../../src/identity/interaction/account/util/LoginStorage';
import {
  ACCOUNT_TYPE,
} from '../../../../../../src/identity/interaction/account/util/LoginStorage';
import { BasePasswordStore } from '../../../../../../src/identity/interaction/password/util/BasePasswordStore';
import { InternalServerError } from '../../../../../../src/util/errors/InternalServerError';

const STORAGE_TYPE = 'password';

describe('A BasePasswordStore', (): void => {
  const id = 'id';
  const email = 'TesT@example.com';
  const lowercase = 'test@example.com';
  const accountId = 'accountId';
  const password = 'password!';
  let payload: Record<string, unknown>;
  let storage: jest.Mocked<AccountLoginStorage<any>>;
  let store: BasePasswordStore;

  beforeEach(async(): Promise<void> => {
    payload = { id, email: lowercase, accountId, password: await hash(password, 10), verified: true };

    storage = {
      defineType: jest.fn().mockResolvedValue({}),
      createIndex: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue(payload),
      has: jest.fn().mockResolvedValue(true),
      get: jest.fn().mockResolvedValue(payload),
      find: jest.fn().mockResolvedValue([ payload ]),
      setField: jest.fn(),
      delete: jest.fn(),
    } satisfies Partial<AccountLoginStorage<any>> as any;

    store = new BasePasswordStore(storage);
  });

  it('defines the type and indexes in the storage.', async(): Promise<void> => {
    await expect(store.handle()).resolves.toBeUndefined();
    expect(storage.defineType).toHaveBeenCalledTimes(1);
    expect(storage.defineType).toHaveBeenLastCalledWith(STORAGE_TYPE, {
      email: 'string',
      password: 'string',
      verified: 'boolean',
      accountId: `id:${ACCOUNT_TYPE}`,
    }, true);
    expect(storage.createIndex).toHaveBeenCalledTimes(2);
    expect(storage.createIndex).toHaveBeenCalledWith(STORAGE_TYPE, 'accountId');
    expect(storage.createIndex).toHaveBeenCalledWith(STORAGE_TYPE, 'email');
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

  it('can create logins.', async(): Promise<void> => {
    storage.find.mockResolvedValueOnce([]);
    await expect(store.create(email, accountId, password)).resolves.toEqual(id);
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { email: lowercase });
    expect(storage.create).toHaveBeenCalledTimes(1);
    expect(storage.create).toHaveBeenLastCalledWith(
      STORAGE_TYPE,
      { accountId, verified: false, email: lowercase, password: expect.any(String) },
    );
  });

  it('errors when creating a second login for an email.', async(): Promise<void> => {
    await expect(store.create(email, accountId, password))
      .rejects.toThrow('There already is a login for this e-mail address.');
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { email: lowercase });
    expect(storage.create).toHaveBeenCalledTimes(0);
  });

  it('can get the login information.', async(): Promise<void> => {
    await expect(store.get(id)).resolves.toEqual({ accountId, email: lowercase });
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith(STORAGE_TYPE, id);
  });

  it('returns undefined if there is no matching login.', async(): Promise<void> => {
    storage.get.mockResolvedValueOnce(undefined);
    await expect(store.get(id)).resolves.toBeUndefined();
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith(STORAGE_TYPE, id);
  });

  it('can find the login information by email.', async(): Promise<void> => {
    await expect(store.findByEmail(email)).resolves.toEqual({ id, accountId });
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { email: lowercase });
  });

  it('can find all logins associated with an account.', async(): Promise<void> => {
    await expect(store.findByAccount(accountId)).resolves.toEqual([{ id, email: lowercase }]);
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { accountId });
  });

  it('errors when verifying a non-existent login.', async(): Promise<void> => {
    storage.has.mockResolvedValueOnce(false);
    await expect(store.confirmVerification(id)).rejects.toThrow('Login does not exist.');
    expect(storage.has).toHaveBeenCalledTimes(1);
    expect(storage.has).toHaveBeenLastCalledWith(STORAGE_TYPE, id);
    expect(storage.setField).toHaveBeenCalledTimes(0);
  });

  it('can verify a login.', async(): Promise<void> => {
    await expect(store.confirmVerification(id)).resolves.toBeUndefined();
    expect(storage.has).toHaveBeenCalledTimes(1);
    expect(storage.has).toHaveBeenLastCalledWith(STORAGE_TYPE, id);
    expect(storage.setField).toHaveBeenCalledTimes(1);
    expect(storage.setField).toHaveBeenLastCalledWith(STORAGE_TYPE, id, 'verified', true);
  });

  it('errors when authenticating a non-existent login.', async(): Promise<void> => {
    storage.find.mockResolvedValueOnce([]);
    await expect(store.authenticate(email, password)).rejects.toThrow('Invalid email/password combination.');
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { email: lowercase });
  });

  it('errors when authenticating an unverified login.', async(): Promise<void> => {
    storage.find.mockResolvedValueOnce([ { ...payload, verified: false } as any ]);
    await expect(store.authenticate(email, password)).rejects.toThrow('Login still needs to be verified.');
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { email: lowercase });
  });

  it('errors when authenticating with the wrong password.', async(): Promise<void> => {
    await expect(store.authenticate(email, 'wrongPassword')).rejects.toThrow('Invalid email/password combination.');
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { email: lowercase });
  });

  it('can authenticate.', async(): Promise<void> => {
    await expect(store.authenticate(email, password)).resolves.toEqual({ accountId, id });
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { email: lowercase });
  });

  it('errors when changing the password of a non-existent account.', async(): Promise<void> => {
    storage.has.mockResolvedValueOnce(false);
    await expect(store.update(id, password)).rejects.toThrow('Login does not exist.');
    expect(storage.has).toHaveBeenCalledTimes(1);
    expect(storage.has).toHaveBeenLastCalledWith(STORAGE_TYPE, id);
    expect(storage.setField).toHaveBeenCalledTimes(0);
  });

  it('can change the password.', async(): Promise<void> => {
    const newPassword = 'newPassword!';
    await expect(store.update(id, newPassword)).resolves.toBeUndefined();
    expect(storage.has).toHaveBeenCalledTimes(1);
    expect(storage.has).toHaveBeenLastCalledWith(STORAGE_TYPE, id);
    expect(storage.setField).toHaveBeenCalledTimes(1);
    expect(storage.setField).toHaveBeenLastCalledWith(STORAGE_TYPE, id, 'password', expect.any(String));
  });

  it('can delete a login.', async(): Promise<void> => {
    await expect(store.delete(email)).resolves.toBeUndefined();
  });
});
