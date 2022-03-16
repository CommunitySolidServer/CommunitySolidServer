import { BaseCookieStore } from '../../../../../../src/identity/interaction/account/util/BaseCookieStore';
import type { ExpiringStorage } from '../../../../../../src/storage/keyvalue/ExpiringStorage';

const cookie = '4c9b88c1-7502-4107-bb79-2a3a590c7aa3';
jest.mock('uuid', (): any => ({ v4: (): string => cookie }));

const now = new Date();
jest.useFakeTimers();
jest.setSystemTime(now);

describe('A BaseCookieStore', (): void => {
  const accountId = 'id';
  let storage: jest.Mocked<ExpiringStorage<string, string>>;
  let store: BaseCookieStore;

  beforeEach(async(): Promise<void> => {
    storage = {
      get: jest.fn().mockResolvedValue(accountId),
      set: jest.fn(),
      delete: jest.fn(),
    } as any;

    store = new BaseCookieStore(storage);
  });

  it('can create new cookies.', async(): Promise<void> => {
    await expect(store.generate(accountId)).resolves.toBe(cookie);
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenLastCalledWith(cookie, accountId, 14 * 24 * 60 * 60 * 1000);
  });

  it('can return the matching account ID.', async(): Promise<void> => {
    await expect(store.get(cookie)).resolves.toBe(accountId);
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith(cookie);
  });

  it('can refresh the expiration timer.', async(): Promise<void> => {
    await expect(store.refresh(cookie)).resolves.toEqual(new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)));
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith(cookie);
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenLastCalledWith(cookie, accountId, 14 * 24 * 60 * 60 * 1000);
  });

  it('does not reset the timer if there is no match.', async(): Promise<void> => {
    storage.get.mockResolvedValueOnce(undefined);
    await expect(store.refresh(cookie)).resolves.toBeUndefined();
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith(cookie);
    expect(storage.set).toHaveBeenCalledTimes(0);
  });

  it('can delete cookies.', async(): Promise<void> => {
    await expect(store.delete(cookie)).resolves.toBeUndefined();
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenLastCalledWith(cookie);
  });
});
