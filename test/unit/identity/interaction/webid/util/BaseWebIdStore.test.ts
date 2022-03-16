import type { Account } from '../../../../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../../../../src/identity/interaction/account/util/AccountStore';
import { BaseWebIdStore } from '../../../../../../src/identity/interaction/webid/util/BaseWebIdStore';
import type { WebIdLinkRoute } from '../../../../../../src/identity/interaction/webid/WebIdLinkRoute';
import type { KeyValueStorage } from '../../../../../../src/storage/keyvalue/KeyValueStorage';
import { BadRequestHttpError } from '../../../../../../src/util/errors/BadRequestHttpError';
import { createAccount, mockAccountStore } from '../../../../../util/AccountUtil';

describe('A BaseWebIdStore', (): void => {
  const webId = 'http://example.com/card#me';
  let account: Account;
  const route: WebIdLinkRoute = {
    getPath: (): string => 'http://example.com/.account/resource',
    matchPath: (): any => ({}),
  };
  let accountStore: jest.Mocked<AccountStore>;
  let storage: jest.Mocked<KeyValueStorage<string, string[]>>;
  let store: BaseWebIdStore;

  beforeEach(async(): Promise<void> => {
    account = createAccount();

    accountStore = mockAccountStore(createAccount());

    storage = {
      get: jest.fn().mockResolvedValue([ account.id ]),
      set: jest.fn(),
      delete: jest.fn(),
    } as any;

    store = new BaseWebIdStore(route, accountStore, storage);
  });

  it('returns the stored account identifiers.', async(): Promise<void> => {
    await expect(store.get(webId)).resolves.toEqual([ account.id ]);
  });

  it('returns an empty list if there are no matching idenfitiers.', async(): Promise<void> => {
    storage.get.mockResolvedValueOnce(undefined);
    await expect(store.get(webId)).resolves.toEqual([]);
  });

  it('can add an account to the linked list.', async(): Promise<void> => {
    await expect(store.add(webId, account)).resolves.toBe('http://example.com/.account/resource');
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenLastCalledWith(webId, [ account.id ]);
    expect(accountStore.update).toHaveBeenCalledTimes(1);
    expect(accountStore.update).toHaveBeenLastCalledWith(account);
    expect(account.webIds[webId]).toBe('http://example.com/.account/resource');
  });

  it('creates a new list if one did not exist yet.', async(): Promise<void> => {
    storage.get.mockResolvedValueOnce(undefined);
    await expect(store.add(webId, account)).resolves.toBe('http://example.com/.account/resource');
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenLastCalledWith(webId, [ account.id ]);
    expect(accountStore.update).toHaveBeenCalledTimes(1);
    expect(accountStore.update).toHaveBeenLastCalledWith(account);
    expect(account.webIds[webId]).toBe('http://example.com/.account/resource');
  });

  it('can not create a link if the WebID is already linked.', async(): Promise<void> => {
    account.webIds[webId] = 'resource';
    await expect(store.add(webId, account)).rejects.toThrow(BadRequestHttpError);
    expect(storage.set).toHaveBeenCalledTimes(0);
    expect(accountStore.update).toHaveBeenCalledTimes(0);
  });

  it('does not update the account if something goes wrong.', async(): Promise<void> => {
    storage.set.mockRejectedValueOnce(new Error('bad data'));
    await expect(store.add(webId, account)).rejects.toThrow('bad data');
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenLastCalledWith(webId, [ account.id ]);
    expect(accountStore.update).toHaveBeenCalledTimes(2);
    expect(accountStore.update).toHaveBeenLastCalledWith(account);
    expect(account.webIds).toEqual({});
  });

  it('can delete a link.', async(): Promise<void> => {
    await expect(store.delete(webId, account)).resolves.toBeUndefined();
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenLastCalledWith(webId);
    expect(accountStore.update).toHaveBeenCalledTimes(1);
    expect(accountStore.update).toHaveBeenLastCalledWith(account);
    expect(account.webIds).toEqual({});
  });

  it('does not remove the entire list if there are still other entries.', async(): Promise<void> => {
    storage.get.mockResolvedValueOnce([ account.id, 'other-id' ]);
    await expect(store.delete(webId, account)).resolves.toBeUndefined();
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenLastCalledWith(webId, [ 'other-id' ]);
    expect(accountStore.update).toHaveBeenCalledTimes(1);
    expect(accountStore.update).toHaveBeenLastCalledWith(account);
    expect(account.webIds).toEqual({});
  });

  it('does not do anything if the the delete WebID target does not exist.', async(): Promise<void> => {
    storage.get.mockResolvedValueOnce(undefined);
    await expect(store.delete('random-webId', account)).resolves.toBeUndefined();
    expect(storage.set).toHaveBeenCalledTimes(0);
    expect(storage.delete).toHaveBeenCalledTimes(0);
    expect(accountStore.update).toHaveBeenCalledTimes(0);
  });

  it('does not do anything if the the delete account target is not linked.', async(): Promise<void> => {
    await expect(store.delete(webId, { ...account, id: 'random-id' })).resolves.toBeUndefined();
    expect(storage.set).toHaveBeenCalledTimes(0);
    expect(storage.delete).toHaveBeenCalledTimes(0);
    expect(accountStore.update).toHaveBeenCalledTimes(0);
  });
});
