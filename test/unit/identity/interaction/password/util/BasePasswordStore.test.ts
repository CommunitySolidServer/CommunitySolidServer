import { BasePasswordStore } from '../../../../../../src/identity/interaction/password/util/BasePasswordStore';
import type {
  LoginPayload,
} from '../../../../../../src/identity/interaction/password/util/BasePasswordStore';
import type { KeyValueStorage } from '../../../../../../src/storage/keyvalue/KeyValueStorage';

describe('A BasePasswordStore', (): void => {
  const email = 'test@example.com';
  const accountId = 'accountId';
  const password = 'password!';
  let storage: jest.Mocked<KeyValueStorage<string, LoginPayload>>;
  let store: BasePasswordStore;

  beforeEach(async(): Promise<void> => {
    const map = new Map();
    storage = {
      get: jest.fn((id: string): any => map.get(id)),
      set: jest.fn((id: string, value: any): any => map.set(id, value)),
      delete: jest.fn((id: string): any => map.delete(id)),
    } as any;

    store = new BasePasswordStore(storage);
  });

  it('can create logins.', async(): Promise<void> => {
    await expect(store.create(email, accountId, password)).resolves.toBeUndefined();
  });

  it('errors when creating a second login for an email.', async(): Promise<void> => {
    await expect(store.create(email, accountId, password)).resolves.toBeUndefined();
    await expect(store.create(email, accountId, 'diffPass'))
      .rejects.toThrow('here already is a login for this e-mail address.');
  });

  it('errors when authenticating a non-existent login.', async(): Promise<void> => {
    await expect(store.authenticate(email, password)).rejects.toThrow('Login does not exist.');
  });

  it('errors when authenticating an unverified login.', async(): Promise<void> => {
    await expect(store.create(email, accountId, password)).resolves.toBeUndefined();
    await expect(store.authenticate(email, password)).rejects.toThrow('Login still needs to be verified.');
  });

  it('errors when verifying a non-existent login.', async(): Promise<void> => {
    await expect(store.confirmVerification(email)).rejects.toThrow('Login does not exist.');
  });

  it('errors when authenticating with the wrong password.', async(): Promise<void> => {
    await expect(store.create(email, accountId, password)).resolves.toBeUndefined();
    await expect(store.confirmVerification(email)).resolves.toBeUndefined();
    await expect(store.authenticate(email, 'wrongPassword')).rejects.toThrow('Incorrect password.');
  });

  it('can authenticate.', async(): Promise<void> => {
    await expect(store.create(email, accountId, password)).resolves.toBeUndefined();
    await expect(store.confirmVerification(email)).resolves.toBeUndefined();
    await expect(store.authenticate(email, password)).resolves.toBe(accountId);
  });

  it('errors when changing the password of a non-existent account.', async(): Promise<void> => {
    await expect(store.update(email, password)).rejects.toThrow('Login does not exist.');
  });

  it('can change the password.', async(): Promise<void> => {
    const newPassword = 'newPassword!';
    await expect(store.create(email, accountId, password)).resolves.toBeUndefined();
    await expect(store.confirmVerification(email)).resolves.toBeUndefined();
    await expect(store.update(email, newPassword)).resolves.toBeUndefined();
    await expect(store.authenticate(email, newPassword)).resolves.toBe(accountId);
  });

  it('can get the accountId.', async(): Promise<void> => {
    await expect(store.create(email, accountId, password)).resolves.toBeUndefined();
    await expect(store.get(email)).resolves.toEqual(accountId);
  });

  it('can delete a login.', async(): Promise<void> => {
    await expect(store.create(email, accountId, password)).resolves.toBeUndefined();
    await expect(store.delete(email)).resolves.toBe(true);
    await expect(store.authenticate(email, password)).rejects.toThrow('Login does not exist.');
    await expect(store.get(accountId)).resolves.toBeUndefined();
  });

  it('does nothing when deleting non-existent login.', async(): Promise<void> => {
    await expect(store.delete(email)).resolves.toBe(false);
  });
});
