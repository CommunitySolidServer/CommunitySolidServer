import type { AccountSettings } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import type {
  EmailPasswordData,
} from '../../../../../../src/identity/interaction/email-password/storage/BaseAccountStore';
import { BaseAccountStore } from '../../../../../../src/identity/interaction/email-password/storage/BaseAccountStore';
import type { ExpiringStorage } from '../../../../../../src/storage/keyvalue/ExpiringStorage';
import type { KeyValueStorage } from '../../../../../../src/storage/keyvalue/KeyValueStorage';

describe('A BaseAccountStore', (): void => {
  let storage: KeyValueStorage<string, EmailPasswordData>;
  let forgotPasswordStorage: ExpiringStorage<string, EmailPasswordData>;
  const saltRounds = 11;
  let store: BaseAccountStore;
  const email = 'test@test.com';
  const webId = 'http://test.com/#webId';
  const password = 'password!';
  const settings: AccountSettings = { useIdp: true };

  beforeEach(async(): Promise<void> => {
    const map = new Map();
    storage = {
      get: jest.fn((id: string): any => map.get(id)),
      set: jest.fn((id: string, value: any): any => map.set(id, value)),
      delete: jest.fn((id: string): any => map.delete(id)),
    } as any;

    forgotPasswordStorage = {
      get: jest.fn((id: string): any => map.get(id)),
      set: jest.fn((id: string, value: any): any => map.set(id, value)),
      delete: jest.fn((id: string): any => map.delete(id)),
    } as any;

    store = new BaseAccountStore(storage, forgotPasswordStorage, saltRounds);
  });

  it('can create accounts.', async(): Promise<void> => {
    await expect(store.create(email, webId, password, settings)).resolves.toBeUndefined();
  });

  it('errors when creating a second account for an email.', async(): Promise<void> => {
    await expect(store.create(email, webId, password, settings)).resolves.toBeUndefined();
    await expect(store.create(email, webId, 'diffPass', settings)).rejects.toThrow('Account already exists');
  });

  it('errors when creating a second account for a WebID.', async(): Promise<void> => {
    await expect(store.create(email, webId, password, settings)).resolves.toBeUndefined();
    await expect(store.create('bob@test.email', webId, 'diffPass', settings))
      .rejects.toThrow('There already is an account for this WebID');
  });

  it('errors when authenticating a non-existent account.', async(): Promise<void> => {
    await expect(store.authenticate(email, password)).rejects.toThrow('Account does not exist');
  });

  it('errors when authenticating an unverified account.', async(): Promise<void> => {
    await expect(store.create(email, webId, password, settings)).resolves.toBeUndefined();
    await expect(store.authenticate(email, 'wrongPassword')).rejects.toThrow('Account still needs to be verified');
  });

  it('errors when verifying a non-existent account.', async(): Promise<void> => {
    await expect(store.verify(email)).rejects.toThrow('Account does not exist');
  });

  it('errors when authenticating with the wrong password.', async(): Promise<void> => {
    await expect(store.create(email, webId, password, settings)).resolves.toBeUndefined();
    await expect(store.verify(email)).resolves.toBeUndefined();
    await expect(store.authenticate(email, 'wrongPassword')).rejects.toThrow('Incorrect password');
  });

  it('can authenticate.', async(): Promise<void> => {
    await expect(store.create(email, webId, password, settings)).resolves.toBeUndefined();
    await expect(store.verify(email)).resolves.toBeUndefined();
    await expect(store.authenticate(email, password)).resolves.toBe(webId);
  });

  it('errors when changing the password of a non-existent account.', async(): Promise<void> => {
    await expect(store.changePassword(email, password)).rejects.toThrow('Account does not exist');
  });

  it('can change the password.', async(): Promise<void> => {
    const newPassword = 'newPassword!';
    await expect(store.create(email, webId, password, settings)).resolves.toBeUndefined();
    await expect(store.verify(email)).resolves.toBeUndefined();
    await expect(store.changePassword(email, newPassword)).resolves.toBeUndefined();
    await expect(store.authenticate(email, newPassword)).resolves.toBe(webId);
  });

  it('can get the settings.', async(): Promise<void> => {
    await expect(store.create(email, webId, password, settings)).resolves.toBeUndefined();
    await expect(store.verify(email)).resolves.toBeUndefined();
    await expect(store.getSettings(webId)).resolves.toBe(settings);
  });

  it('can update the settings.', async(): Promise<void> => {
    const newSettings = { webId, useIdp: false };
    await expect(store.create(email, webId, password, settings)).resolves.toBeUndefined();
    await expect(store.verify(email)).resolves.toBeUndefined();
    await expect(store.updateSettings(webId, newSettings)).resolves.toBeUndefined();
    await expect(store.getSettings(webId)).resolves.toBe(newSettings);
  });

  it('can delete an account.', async(): Promise<void> => {
    await expect(store.create(email, webId, password, settings)).resolves.toBeUndefined();
    await expect(store.deleteAccount(email)).resolves.toBeUndefined();
    await expect(store.authenticate(email, password)).rejects.toThrow('Account does not exist');
    await expect(store.getSettings(webId)).rejects.toThrow('Account does not exist');
  });

  it('does nothing when deleting non-existent accounts.', async(): Promise<void> => {
    await expect(store.deleteAccount(email)).resolves.toBeUndefined();
  });

  it('errors when forgetting the password of an account that does not exist.', async(): Promise<void> => {
    await expect(store.generateForgotPasswordRecord(email)).rejects.toThrow('Account does not exist');
  });

  it('generates a recordId when a password was forgotten.', async(): Promise<void> => {
    await expect(store.create(email, webId, password, settings)).resolves.toBeUndefined();
    const recordId = await store.generateForgotPasswordRecord(email);
    expect(typeof recordId).toBe('string');
  });

  it('returns undefined if there is no matching record to retrieve.', async(): Promise<void> => {
    await expect(store.getForgotPasswordRecord('unknownRecord')).resolves.toBeUndefined();
  });

  it('returns the email matching the forgotten password record.', async(): Promise<void> => {
    await expect(store.create(email, webId, password, settings)).resolves.toBeUndefined();
    const recordId = await store.generateForgotPasswordRecord(email);
    await expect(store.getForgotPasswordRecord(recordId)).resolves.toBe(email);
  });

  it('can delete stored forgotten password records.', async(): Promise<void> => {
    await expect(store.create(email, webId, password, settings)).resolves.toBeUndefined();
    const recordId = await store.generateForgotPasswordRecord(email);
    await expect(store.deleteForgotPasswordRecord(recordId)).resolves.toBeUndefined();
    await expect(store.getForgotPasswordRecord('unknownRecord')).resolves.toBeUndefined();
  });
});
