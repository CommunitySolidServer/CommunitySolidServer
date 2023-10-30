import type {
  AccountLoginStorage,
} from '../../../../../../src/identity/interaction/account/util/LoginStorage';
import { ACCOUNT_TYPE } from '../../../../../../src/identity/interaction/account/util/LoginStorage';
import { BaseWebIdStore } from '../../../../../../src/identity/interaction/webid/util/BaseWebIdStore';
import { BadRequestHttpError } from '../../../../../../src/util/errors/BadRequestHttpError';
import { InternalServerError } from '../../../../../../src/util/errors/InternalServerError';

const STORAGE_TYPE = 'webIdLink';

describe('A BaseWebIdStore', (): void => {
  const id = 'id';
  const webId = 'http://example.com/card#me';
  const accountId = 'accountId';
  let storage: jest.Mocked<AccountLoginStorage<any>>;
  let store: BaseWebIdStore;

  beforeEach(async(): Promise<void> => {
    storage = {
      defineType: jest.fn().mockResolvedValue({}),
      createIndex: jest.fn().mockResolvedValue({}),
      get: jest.fn().mockResolvedValue({ webId, accountId }),
      create: jest.fn().mockResolvedValue({ id, webId, accountId }),
      find: jest.fn().mockResolvedValue([{ id, webId, accountId }]),
      delete: jest.fn(),
    } satisfies Partial<AccountLoginStorage<any>> as any;

    store = new BaseWebIdStore(storage);
  });

  it('defines the type and indexes in the storage.', async(): Promise<void> => {
    await expect(store.handle()).resolves.toBeUndefined();
    expect(storage.defineType).toHaveBeenCalledTimes(1);
    expect(storage.defineType).toHaveBeenLastCalledWith(STORAGE_TYPE, {
      webId: 'string',
      accountId: `id:${ACCOUNT_TYPE}`,
    }, false);
    expect(storage.createIndex).toHaveBeenCalledTimes(2);
    expect(storage.createIndex).toHaveBeenCalledWith(STORAGE_TYPE, 'accountId');
    expect(storage.createIndex).toHaveBeenCalledWith(STORAGE_TYPE, 'webId');
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

  it('returns the matching information.', async(): Promise<void> => {
    await expect(store.get(id)).resolves.toEqual({ accountId, webId });
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith(STORAGE_TYPE, id);
  });

  it('can verify if a WebID is linked to an account.', async(): Promise<void> => {
    await expect(store.isLinked(webId, accountId)).resolves.toBe(true);
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { webId, accountId });
  });

  it('can find all WebIDs linked to an account.', async(): Promise<void> => {
    await expect(store.findLinks(accountId)).resolves.toEqual([{ id, webId }]);
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { accountId });
  });

  it('can create a new WebID link.', async(): Promise<void> => {
    storage.find.mockResolvedValueOnce([]);
    await expect(store.create(webId, accountId)).resolves.toBe(id);
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { webId, accountId });
    expect(storage.create).toHaveBeenCalledTimes(1);
    expect(storage.create).toHaveBeenLastCalledWith(STORAGE_TYPE, { webId, accountId });
  });

  it('can not create a link if the WebID is already linked to that account.', async(): Promise<void> => {
    await expect(store.create(webId, accountId)).rejects.toThrow(BadRequestHttpError);
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { webId, accountId });
    expect(storage.create).toHaveBeenCalledTimes(0);
  });

  it('can delete a link.', async(): Promise<void> => {
    await expect(store.delete(id)).resolves.toBeUndefined();
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenLastCalledWith(STORAGE_TYPE, id);
  });
});
