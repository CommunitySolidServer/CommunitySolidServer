import {
  BaseLoginAccountStorage,
} from '../../../../../../src/identity/interaction/account/util/BaseLoginAccountStorage';
import { ACCOUNT_TYPE } from '../../../../../../src/identity/interaction/account/util/LoginStorage';
import type { IndexedStorage } from '../../../../../../src/storage/keyvalue/IndexedStorage';
import { NotFoundHttpError } from '../../../../../../src/util/errors/NotFoundHttpError';

jest.useFakeTimers();

describe('A BaseLoginAccountStorage', (): void => {
  let source: jest.Mocked<IndexedStorage<any>>;
  let storage: BaseLoginAccountStorage<any>;

  beforeEach(async(): Promise<void> => {
    source = {
      defineType: jest.fn().mockResolvedValue(undefined),
      createIndex: jest.fn().mockResolvedValue(undefined),
      has: jest.fn(),
      get: jest.fn(),
      create: jest.fn(async(type, value): Promise<any> => ({ ...value, id: 'id' })),
      find: jest.fn(),
      findIds: jest.fn(),
      set: jest.fn(),
      setField: jest.fn(),
      delete: jest.fn(),
      entries: jest.fn(),
    };

    storage = new BaseLoginAccountStorage(source);
  });

  it('calls the source when defining types.', async(): Promise<void> => {
    await expect(storage.defineType('dummy', { test: 'string' }, false)).resolves.toBeUndefined();
    expect(source.defineType).toHaveBeenCalledTimes(1);
    expect(source.defineType).toHaveBeenLastCalledWith('dummy', { test: 'string' });
  });

  it('adds the linkedLoginsCount parameter when defining the account type.', async(): Promise<void> => {
    await expect(storage.defineType(ACCOUNT_TYPE, { test: 'string' }, false)).resolves.toBeUndefined();
    expect(source.defineType).toHaveBeenCalledTimes(1);
    expect(source.defineType).toHaveBeenLastCalledWith(ACCOUNT_TYPE, { test: 'string', linkedLoginsCount: 'number' });
  });

  it('calls the source when defining indexes.', async(): Promise<void> => {
    await expect(storage.createIndex('dummy', 'key' as any)).resolves.toBeUndefined();
    expect(source.createIndex).toHaveBeenCalledTimes(1);
    expect(source.createIndex).toHaveBeenLastCalledWith('dummy', 'key');
  });

  it('adds a linkedLoginsCount when creating an account.', async(): Promise<void> => {
    await expect(storage.create(ACCOUNT_TYPE, { test: 'data' })).resolves.toEqual({ test: 'data', id: 'id' });
    expect(source.create).toHaveBeenCalledTimes(1);
    expect(source.create).toHaveBeenLastCalledWith(ACCOUNT_TYPE, { test: 'data', linkedLoginsCount: 0 });
  });

  it('deletes an account after the set timeout if it has no login methods.', async(): Promise<void> => {
    source.get.mockResolvedValueOnce({ id: 'id', linkedLoginsCount: 0 });
    await expect(storage.create(ACCOUNT_TYPE, { test: 'data' })).resolves.toEqual({ test: 'data', id: 'id' });
    expect(source.create).toHaveBeenCalledTimes(1);
    expect(source.create).toHaveBeenLastCalledWith(ACCOUNT_TYPE, { test: 'data', linkedLoginsCount: 0 });
    expect(source.delete).toHaveBeenCalledTimes(0);

    await jest.advanceTimersByTimeAsync(30 * 60 * 1000);

    expect(source.delete).toHaveBeenCalledTimes(1);
    expect(source.delete).toHaveBeenLastCalledWith(ACCOUNT_TYPE, 'id');
  });

  it('does not delete an account after the set timeout if it has a login method.', async(): Promise<void> => {
    source.get.mockResolvedValueOnce({ id: 'id', linkedLoginsCount: 1 });
    await expect(storage.create(ACCOUNT_TYPE, { test: 'data' })).resolves.toEqual({ test: 'data', id: 'id' });
    expect(source.create).toHaveBeenCalledTimes(1);
    expect(source.create).toHaveBeenLastCalledWith(ACCOUNT_TYPE, { test: 'data', linkedLoginsCount: 0 });
    expect(source.delete).toHaveBeenCalledTimes(0);

    await jest.advanceTimersByTimeAsync(30 * 60 * 1000);

    expect(source.delete).toHaveBeenCalledTimes(0);
  });

  it('prevents creating entries if the account has no linked logins.', async(): Promise<void> => {
    source.get.mockResolvedValueOnce({ id: 'id', linkedLoginsCount: 0 });
    await storage.defineType('dummy', { test: 'string', account: `id:${ACCOUNT_TYPE}` }, false);
    await expect(storage.create('dummy', { test: 'data', account: 'id' }))
      .rejects.toThrow('An account needs at least 1 login method.');
    expect(source.get).toHaveBeenCalledTimes(1);
    expect(source.get).toHaveBeenLastCalledWith(ACCOUNT_TYPE, 'id');
    expect(source.create).toHaveBeenCalledTimes(0);
  });

  it('can create new login methods if there are no linked logins.', async(): Promise<void> => {
    source.get.mockResolvedValueOnce({ id: 'id', linkedLoginsCount: 0 });
    await storage.defineType('dummy', { test: 'string', account: `id:${ACCOUNT_TYPE}` }, true);
    await expect(storage.create('dummy', { test: 'data', account: 'id' }))
      .resolves.toEqual({ test: 'data', id: 'id', account: 'id' });
    expect(source.get).toHaveBeenCalledTimes(1);
    expect(source.get).toHaveBeenLastCalledWith(ACCOUNT_TYPE, 'id');
    expect(source.create).toHaveBeenCalledTimes(1);
    expect(source.create).toHaveBeenLastCalledWith('dummy', { test: 'data', account: 'id' });
  });

  it('can create other entries if there is at least one linked login.', async(): Promise<void> => {
    source.get.mockResolvedValueOnce({ id: 'id', linkedLoginsCount: 1 });
    await storage.defineType('dummy', { test: 'string', account: `id:${ACCOUNT_TYPE}` }, false);
    await expect(storage.create('dummy', { test: 'data', account: 'id' }))
      .resolves.toEqual({ test: 'data', id: 'id', account: 'id' });
    expect(source.get).toHaveBeenCalledTimes(1);
    expect(source.get).toHaveBeenLastCalledWith(ACCOUNT_TYPE, 'id');
    expect(source.create).toHaveBeenCalledTimes(1);
    expect(source.create).toHaveBeenLastCalledWith('dummy', { test: 'data', account: 'id' });
  });

  it('throws a 404 if the linked account does not exist.', async(): Promise<void> => {
    source.get.mockResolvedValueOnce(undefined);
    await storage.defineType('dummy', { test: 'string', account: `id:${ACCOUNT_TYPE}` }, false);
    await expect(storage.create('dummy', { test: 'data', account: 'id' })).rejects.toThrow(NotFoundHttpError);
    expect(source.get).toHaveBeenCalledTimes(1);
    expect(source.get).toHaveBeenLastCalledWith(ACCOUNT_TYPE, 'id');
    expect(source.create).toHaveBeenCalledTimes(0);
  });

  it('calls the source when checking existence.', async(): Promise<void> => {
    source.has.mockResolvedValueOnce(true);
    await expect(storage.has('dummy', 'id')).resolves.toBe(true);
    expect(source.has).toHaveBeenCalledTimes(1);
    expect(source.has).toHaveBeenLastCalledWith('dummy', 'id');
  });

  it('removes the linkedLoginsCount field when getting values.', async(): Promise<void> => {
    source.get.mockResolvedValueOnce({ id: 'id', test: 'data', linkedLoginsCount: 1 });
    await expect(storage.get(ACCOUNT_TYPE, 'id')).resolves.toEqual({ id: 'id', test: 'data' });
    expect(source.get).toHaveBeenCalledTimes(1);
    expect(source.get).toHaveBeenLastCalledWith(ACCOUNT_TYPE, 'id');
  });

  it('removes the linkedLoginsCount field when finding values.', async(): Promise<void> => {
    source.find.mockResolvedValueOnce([{ id: 'id', test: 'data', linkedLoginsCount: 1 }]);
    await expect(storage.find(ACCOUNT_TYPE, { test: 'data' })).resolves.toEqual([{ id: 'id', test: 'data' }]);
    expect(source.find).toHaveBeenCalledTimes(1);
    expect(source.find).toHaveBeenLastCalledWith(ACCOUNT_TYPE, { test: 'data' });
  });

  it('calls the source when finding IDs.', async(): Promise<void> => {
    source.findIds.mockResolvedValueOnce([ 'id' ]);
    await expect(storage.findIds(ACCOUNT_TYPE, { test: 'data' })).resolves.toEqual([ 'id' ]);
    expect(source.findIds).toHaveBeenCalledTimes(1);
    expect(source.findIds).toHaveBeenLastCalledWith(ACCOUNT_TYPE, { test: 'data' });
  });

  it('calls the source when setting values.', async(): Promise<void> => {
    await expect(storage.set('dummy', { test: 'data' } as any)).resolves.toBeUndefined();
    expect(source.set).toHaveBeenCalledTimes(1);
    expect(source.set).toHaveBeenLastCalledWith('dummy', { test: 'data' });
  });

  it('keeps the linkedLoginsCount when setting account values.', async(): Promise<void> => {
    source.get.mockResolvedValueOnce({ id: 'id', test: 'data', linkedLoginsCount: 1 });
    await expect(storage.set(ACCOUNT_TYPE, { test: 'data' } as any)).resolves.toBeUndefined();
    expect(source.set).toHaveBeenCalledTimes(1);
    expect(source.set).toHaveBeenLastCalledWith(ACCOUNT_TYPE, { test: 'data', linkedLoginsCount: 1 });
  });

  it('throws a 404 when trying to set an unknown account.', async(): Promise<void> => {
    source.get.mockResolvedValueOnce(undefined);
    await expect(storage.set(ACCOUNT_TYPE, { test: 'data' } as any)).rejects.toThrow(NotFoundHttpError);
    expect(source.set).toHaveBeenCalledTimes(0);
  });

  it('calls the source when setting specific keys.', async(): Promise<void> => {
    await expect(storage.setField('dummy', 'id', 'test', 'data')).resolves.toBeUndefined();
    expect(source.setField).toHaveBeenCalledTimes(1);
    expect(source.setField).toHaveBeenLastCalledWith('dummy', 'id', 'test', 'data');
  });

  it('calls the source when deleting an account.', async(): Promise<void> => {
    await expect(storage.delete(ACCOUNT_TYPE, 'id')).resolves.toBeUndefined();
    expect(source.delete).toHaveBeenCalledTimes(1);
    expect(source.delete).toHaveBeenLastCalledWith(ACCOUNT_TYPE, 'id');
  });

  it('prevents deleting login methods if it is the last one.', async(): Promise<void> => {
    // Original
    source.get.mockResolvedValueOnce({ id: 'dum', account: 'id' });
    // Account
    source.get.mockResolvedValueOnce({ id: 'id', linkedLoginsCount: 1 });
    await storage.defineType('dummy', { test: 'string', account: `id:${ACCOUNT_TYPE}` }, true);
    await expect(storage.delete('dummy', 'dum')).rejects.toThrow('An account needs at least 1 login method.');
    expect(source.get).toHaveBeenCalledTimes(2);
    expect(source.get).toHaveBeenNthCalledWith(1, 'dummy', 'dum');
    expect(source.get).toHaveBeenNthCalledWith(2, ACCOUNT_TYPE, 'id');
    expect(source.delete).toHaveBeenCalledTimes(0);
  });

  it('can delete login methods if there is more than one.', async(): Promise<void> => {
    // Original
    source.get.mockResolvedValueOnce({ id: 'dum', account: 'id' });
    // Account
    source.get.mockResolvedValueOnce({ id: 'id', linkedLoginsCount: 2 });
    await storage.defineType('dummy', { test: 'string', account: `id:${ACCOUNT_TYPE}` }, true);
    await expect(storage.delete('dummy', 'dum')).resolves.toBeUndefined();
    expect(source.get).toHaveBeenCalledTimes(2);
    expect(source.get).toHaveBeenNthCalledWith(1, 'dummy', 'dum');
    expect(source.get).toHaveBeenNthCalledWith(2, ACCOUNT_TYPE, 'id');
    expect(source.delete).toHaveBeenCalledTimes(1);
    expect(source.delete).toHaveBeenLastCalledWith('dummy', 'dum');
  });

  it('throws a 404 when deleting an unknown login entry.', async(): Promise<void> => {
    await storage.defineType('dummy', { test: 'string', account: `id:${ACCOUNT_TYPE}` }, true);
    source.get.mockResolvedValueOnce(undefined);
    await expect(storage.delete('dummy', 'dum')).rejects.toThrow(NotFoundHttpError);
    expect(source.get).toHaveBeenCalledTimes(1);
    expect(source.get).toHaveBeenLastCalledWith('dummy', 'dum');
    expect(source.delete).toHaveBeenCalledTimes(0);
  });

  it('can delete non-login entries.', async(): Promise<void> => {
    await storage.defineType('dummy', { test: 'string', account: `id:${ACCOUNT_TYPE}` }, false);
    await expect(storage.delete('dummy', 'dum')).resolves.toBeUndefined();
    expect(source.get).toHaveBeenCalledTimes(0);
    expect(source.delete).toHaveBeenCalledTimes(1);
    expect(source.delete).toHaveBeenLastCalledWith('dummy', 'dum');
  });

  it('calls the source when finding all entries.', async(): Promise<void> => {
    source.entries.mockReturnValueOnce((async function* (): AsyncIterableIterator<any> {
      yield { id: 'dum', account: 'id' };
      yield { id: 'id', linkedLoginsCount: 2 };
    })());

    const result = [];
    for await (const entry of storage.entries('type')) {
      result.push(entry);
    }

    expect(result).toEqual([
      { id: 'dum', account: 'id' },
      { id: 'id' },
    ]);
    expect(source.entries).toHaveBeenCalledTimes(1);
    expect(source.entries).toHaveBeenLastCalledWith('type');
  });
});
