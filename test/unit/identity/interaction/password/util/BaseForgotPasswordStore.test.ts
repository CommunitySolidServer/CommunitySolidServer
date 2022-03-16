import {
  BaseForgotPasswordStore,
} from '../../../../../../src/identity/interaction/password/util/BaseForgotPasswordStore';
import type { ExpiringStorage } from '../../../../../../src/storage/keyvalue/ExpiringStorage';

const record = '4c9b88c1-7502-4107-bb79-2a3a590c7aa3';
jest.mock('uuid', (): any => ({ v4: (): string => record }));

describe('A BaseForgotPasswordStore', (): void => {
  const email = 'email@example.com';
  let storage: jest.Mocked<ExpiringStorage<string, string>>;
  let store: BaseForgotPasswordStore;

  beforeEach(async(): Promise<void> => {
    storage = {
      get: jest.fn().mockResolvedValue(email),
      set: jest.fn(),
      delete: jest.fn(),
    } as any;

    store = new BaseForgotPasswordStore(storage);
  });

  it('can create new records.', async(): Promise<void> => {
    await expect(store.generate(email)).resolves.toBe(record);
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenLastCalledWith(record, email, 15 * 60 * 1000);
  });

  it('returns the matching email.', async(): Promise<void> => {
    await expect(store.get(record)).resolves.toBe(email);
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith(record);
  });

  it('can delete records.', async(): Promise<void> => {
    await expect(store.delete(record)).resolves.toBeUndefined();
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenLastCalledWith(record);
  });
});
