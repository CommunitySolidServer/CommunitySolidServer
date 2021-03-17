import type {
  EmailPasswordData,
} from '../../../../../../src/identity/interaction/email-password/storage/KeyValueEmailPasswordStore';
import {
  KeyValueEmailPasswordStore,
} from '../../../../../../src/identity/interaction/email-password/storage/KeyValueEmailPasswordStore';
import type { ResourceIdentifier } from '../../../../../../src/ldp/representation/ResourceIdentifier';
import type { KeyValueStorage } from '../../../../../../src/storage/keyvalue/KeyValueStorage';

describe('A KeyValueEmailPasswordStore', (): void => {
  const baseUrl = 'http://test.com/foo/';
  const storagePathName = '/mail/storage';
  let storage: KeyValueStorage<ResourceIdentifier, EmailPasswordData>;
  const saltRounds = 11;
  let store: KeyValueEmailPasswordStore;
  const email = 'test@test.com';
  const webId = 'http://test.com/#webId';
  const password = 'password!';

  beforeEach(async(): Promise<void> => {
    const map = new Map();
    storage = {
      get: jest.fn((id: ResourceIdentifier): any => map.get(id.path)),
      set: jest.fn((id: ResourceIdentifier, value: any): any => map.set(id.path, value)),
      delete: jest.fn((id: ResourceIdentifier): any => map.delete(id.path)),
    } as any;

    store = new KeyValueEmailPasswordStore({ baseUrl, storagePathName, storage, saltRounds });
  });

  it('errors if the storagePathName does not start with a slash.', async(): Promise<void> => {
    expect((): any => new KeyValueEmailPasswordStore({ baseUrl, storagePathName: 'noSlash', storage, saltRounds }))
      .toThrow('storagePathName should start with a slash.');
  });

  it('can create accounts.', async(): Promise<void> => {
    await expect(store.create(email, webId, password)).resolves.toBeUndefined();
  });

  it('errors when creating a second account for an email.', async(): Promise<void> => {
    await expect(store.create(email, webId, password)).resolves.toBeUndefined();
    await expect(store.create(email, 'diffId', 'diffPass')).rejects.toThrow('Account already exists');
  });

  it('errors when authenticating a non-existent account.', async(): Promise<void> => {
    await expect(store.authenticate(email, password)).rejects.toThrow('No account by that email');
  });

  it('errors when authenticating with the wrong password.', async(): Promise<void> => {
    await expect(store.create(email, webId, password)).resolves.toBeUndefined();
    await expect(store.authenticate(email, 'wrongPassword')).rejects.toThrow('Incorrect password');
  });

  it('can authenticate.', async(): Promise<void> => {
    await expect(store.create(email, webId, password)).resolves.toBeUndefined();
    await expect(store.authenticate(email, password)).resolves.toBe(webId);
  });

  it('errors when changing the password of a non-existent account.', async(): Promise<void> => {
    await expect(store.changePassword(email, password)).rejects.toThrow('Account does not exist');
  });

  it('can change the password.', async(): Promise<void> => {
    const newPassword = 'newPassword!';
    await expect(store.create(email, webId, password)).resolves.toBeUndefined();
    await expect(store.changePassword(email, newPassword)).resolves.toBeUndefined();
    await expect(store.authenticate(email, newPassword)).resolves.toBe(webId);
  });

  it('can delete an account.', async(): Promise<void> => {
    await expect(store.create(email, webId, password)).resolves.toBeUndefined();
    await expect(store.deleteAccount(email)).resolves.toBeUndefined();
    await expect(store.authenticate(email, password)).rejects.toThrow('No account by that email');
  });

  it('errors when forgetting the password of an account that does not exist.', async(): Promise<void> => {
    await expect(store.generateForgotPasswordRecord(email)).rejects.toThrow('Account does not exist');
  });

  it('generates a recordId when a password was forgotten.', async(): Promise<void> => {
    await expect(store.create(email, webId, password)).resolves.toBeUndefined();
    const recordId = await store.generateForgotPasswordRecord(email);
    expect(typeof recordId).toBe('string');
  });

  it('returns undefined if there is no matching record to retrieve.', async(): Promise<void> => {
    await expect(store.getForgotPasswordRecord('unknownRecord')).resolves.toBeUndefined();
  });

  it('returns the email matching the forgotten password record.', async(): Promise<void> => {
    await expect(store.create(email, webId, password)).resolves.toBeUndefined();
    const recordId = await store.generateForgotPasswordRecord(email);
    await expect(store.getForgotPasswordRecord(recordId)).resolves.toBe(email);
  });

  it('can delete stored forgotten password records.', async(): Promise<void> => {
    await expect(store.create(email, webId, password)).resolves.toBeUndefined();
    const recordId = await store.generateForgotPasswordRecord(email);
    await expect(store.deleteForgotPasswordRecord(recordId)).resolves.toBeUndefined();
    await expect(store.getForgotPasswordRecord('unknownRecord')).resolves.toBeUndefined();
  });
});
