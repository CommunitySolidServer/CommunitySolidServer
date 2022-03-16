import type { Account } from '../../../../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../../../../src/identity/interaction/account/util/AccountStore';
import {
  BaseClientCredentialsStore,
} from '../../../../../../src/identity/interaction/client-credentials/util/BaseClientCredentialsStore';
import type {
  ClientCredentialsIdRoute,
} from '../../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsIdRoute';
import type {
  ClientCredentials,
} from '../../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsStore';
import type { KeyValueStorage } from '../../../../../../src/storage/keyvalue/KeyValueStorage';
import { BadRequestHttpError } from '../../../../../../src/util/errors/BadRequestHttpError';
import { createAccount, mockAccountStore } from '../../../../../util/AccountUtil';

const secret = 'verylongstringof64bytes';
jest.mock('crypto', (): any => ({ randomBytes: (): string => secret }));

describe('A BaseClientCredentialsStore', (): void => {
  const webId = 'http://example.com/card#me';
  let account: Account;
  const route: ClientCredentialsIdRoute = {
    getPath: (): string => 'http://example.com/.account/resource',
    matchPath: (): any => ({}),
  };
  let accountStore: jest.Mocked<AccountStore>;
  let storage: jest.Mocked<KeyValueStorage<string, ClientCredentials>>;
  let store: BaseClientCredentialsStore;

  beforeEach(async(): Promise<void> => {
    account = createAccount();
    account.webIds[webId] = 'resource';

    // Different account object so `safeUpdate` can be tested correctly
    const oldAccount = createAccount();
    oldAccount.webIds[webId] = 'resource';
    accountStore = mockAccountStore(oldAccount);

    storage = {
      get: jest.fn().mockResolvedValue({ accountId: account.id, webId, secret: 'secret' }),
      set: jest.fn(),
      delete: jest.fn(),
    } as any;

    store = new BaseClientCredentialsStore(route, accountStore, storage);
  });

  it('returns the token it finds.', async(): Promise<void> => {
    await expect(store.get('credentialsId')).resolves.toEqual({ accountId: account.id, webId, secret: 'secret' });
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith('credentialsId');
  });

  it('creates a new token and adds it to the account.', async(): Promise<void> => {
    await expect(store.add('credentialsId', webId, account)).resolves
      .toEqual({ secret, resource: 'http://example.com/.account/resource' });
    expect(account.clientCredentials.credentialsId).toBe('http://example.com/.account/resource');
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenLastCalledWith('credentialsId', { secret, accountId: account.id, webId });
    expect(accountStore.update).toHaveBeenCalledTimes(1);
    expect(accountStore.update).toHaveBeenLastCalledWith(account);
  });

  it('errors if the WebID is not registered to the account.', async(): Promise<void> => {
    delete account.webIds[webId];
    await expect(store.add('credentialsId', webId, account)).rejects.toThrow(BadRequestHttpError);
    expect(storage.set).toHaveBeenCalledTimes(0);
    expect(accountStore.update).toHaveBeenCalledTimes(0);
    expect(account.clientCredentials).toEqual({});
  });

  it('does not update the account if something goes wrong.', async(): Promise<void> => {
    storage.set.mockRejectedValueOnce(new Error('bad data'));
    await expect(store.add('credentialsId', webId, account)).rejects.toThrow('bad data');
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenLastCalledWith('credentialsId', { secret, accountId: account.id, webId });
    expect(accountStore.update).toHaveBeenCalledTimes(2);
    expect(accountStore.update).toHaveBeenLastCalledWith(account);
    expect(account.clientCredentials).toEqual({});
  });

  it('can delete tokens.', async(): Promise<void> => {
    account.clientCredentials.credentialsId = 'resource';
    await expect(store.delete('credentialsId', account)).resolves.toBeUndefined();
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenLastCalledWith('credentialsId');
    expect(accountStore.update).toHaveBeenCalledTimes(1);
    expect(accountStore.update).toHaveBeenLastCalledWith(account);
    expect(account.clientCredentials).toEqual({});
  });
});
