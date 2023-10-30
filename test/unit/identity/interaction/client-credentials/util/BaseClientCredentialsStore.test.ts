import type {
  AccountLoginStorage,
} from '../../../../../../src/identity/interaction/account/util/LoginStorage';
import {
  ACCOUNT_TYPE,
} from '../../../../../../src/identity/interaction/account/util/LoginStorage';
import {
  BaseClientCredentialsStore,
} from '../../../../../../src/identity/interaction/client-credentials/util/BaseClientCredentialsStore';
import type {
  ClientCredentials,
} from '../../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsStore';
import { InternalServerError } from '../../../../../../src/util/errors/InternalServerError';

const STORAGE_TYPE = 'clientCredentials';
const secret = 'verylongstringof64bytes';
jest.mock('node:crypto', (): any => ({ randomBytes: (): string => secret }));

describe('A BaseClientCredentialsStore', (): void => {
  const webId = 'http://example.com/card#me';
  const id = 'id';
  const accountId = 'accountId;';
  const label = 'token';
  const token: ClientCredentials = { id, label, secret, accountId, webId };
  let storage: jest.Mocked<AccountLoginStorage<any>>;
  let store: BaseClientCredentialsStore;

  beforeEach(async(): Promise<void> => {
    storage = {
      defineType: jest.fn().mockResolvedValue({}),
      createIndex: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue(token),
      get: jest.fn().mockResolvedValue(token),
      find: jest.fn().mockResolvedValue([ token ]),
      delete: jest.fn(),
    } satisfies Partial<AccountLoginStorage<any>> as any;

    store = new BaseClientCredentialsStore(storage);
  });

  it('defines the type and indexes in the storage.', async(): Promise<void> => {
    await expect(store.handle()).resolves.toBeUndefined();
    expect(storage.defineType).toHaveBeenCalledTimes(1);
    expect(storage.defineType).toHaveBeenLastCalledWith(STORAGE_TYPE, {
      label: 'string',
      accountId: `id:${ACCOUNT_TYPE}`,
      secret: 'string',
      webId: 'string',
    }, false);
    expect(storage.createIndex).toHaveBeenCalledTimes(2);
    expect(storage.createIndex).toHaveBeenCalledWith(STORAGE_TYPE, 'accountId');
    expect(storage.createIndex).toHaveBeenCalledWith(STORAGE_TYPE, 'label');
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

  it('returns the token it finds.', async(): Promise<void> => {
    await expect(store.get(id)).resolves.toEqual(token);
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith(STORAGE_TYPE, id);
  });

  it('can find the token using its label.', async(): Promise<void> => {
    await expect(store.findByLabel(label)).resolves.toEqual(token);
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { label });

    storage.find.mockResolvedValueOnce([]);
    await expect(store.findByLabel(label)).resolves.toBeUndefined();
    expect(storage.find).toHaveBeenCalledTimes(2);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { label });
  });

  it('can find the token using its accountId.', async(): Promise<void> => {
    await expect(store.findByAccount(accountId)).resolves.toEqual([ token ]);
    expect(storage.find).toHaveBeenCalledTimes(1);
    expect(storage.find).toHaveBeenLastCalledWith(STORAGE_TYPE, { accountId });
  });

  it('can create new tokens.', async(): Promise<void> => {
    await expect(store.create(label, webId, accountId)).resolves.toEqual(token);
    expect(storage.create).toHaveBeenCalledTimes(1);
    expect(storage.create).toHaveBeenLastCalledWith(STORAGE_TYPE, { label, webId, accountId, secret });
  });

  it('can delete tokens.', async(): Promise<void> => {
    await expect(store.delete(id)).resolves.toBeUndefined();
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenLastCalledWith(STORAGE_TYPE, id);
  });
});
