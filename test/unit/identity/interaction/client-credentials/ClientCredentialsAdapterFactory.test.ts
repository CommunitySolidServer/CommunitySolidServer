import type { Adapter } from 'oidc-provider';
import type { AccountStore } from '../../../../../src/identity/interaction/account/util/AccountStore';
import {
  ClientCredentialsAdapter, ClientCredentialsAdapterFactory,
} from '../../../../../src/identity/interaction/client-credentials/ClientCredentialsAdapterFactory';
import type {
  ClientCredentialsStore,
} from '../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsStore';
import type { AdapterFactory } from '../../../../../src/identity/storage/AdapterFactory';
import { createAccount, mockAccountStore } from '../../../../util/AccountUtil';

describe('A ClientCredentialsAdapterFactory', (): void => {
  let credentialsStore: jest.Mocked<ClientCredentialsStore>;
  let accountStore: jest.Mocked<AccountStore>;
  let sourceAdapter: jest.Mocked<Adapter>;
  let sourceFactory: jest.Mocked<AdapterFactory>;
  let adapter: ClientCredentialsAdapter;
  let factory: ClientCredentialsAdapterFactory;

  beforeEach(async(): Promise<void> => {
    sourceAdapter = {
      find: jest.fn(),
    } as any;

    sourceFactory = {
      createStorageAdapter: jest.fn().mockReturnValue(sourceAdapter),
    };

    accountStore = mockAccountStore();

    credentialsStore = {
      get: jest.fn(),
      delete: jest.fn(),
    } as any;

    adapter = new ClientCredentialsAdapter('Client', sourceAdapter, accountStore, credentialsStore);
    factory = new ClientCredentialsAdapterFactory(sourceFactory, accountStore, credentialsStore);
  });

  it('calls the source factory when creating a new Adapter.', async(): Promise<void> => {
    expect(factory.createStorageAdapter('Name')).toBeInstanceOf(ClientCredentialsAdapter);
    expect(sourceFactory.createStorageAdapter).toHaveBeenCalledTimes(1);
    expect(sourceFactory.createStorageAdapter).toHaveBeenLastCalledWith('Name');
  });

  it('returns the result from the source.', async(): Promise<void> => {
    sourceAdapter.find.mockResolvedValue({ payload: 'payload' });
    await expect(adapter.find('id')).resolves.toEqual({ payload: 'payload' });
    expect(sourceAdapter.find).toHaveBeenCalledTimes(1);
    expect(sourceAdapter.find).toHaveBeenLastCalledWith('id');
    expect(credentialsStore.get).toHaveBeenCalledTimes(0);
    expect(accountStore.get).toHaveBeenCalledTimes(0);
  });

  it('tries to find a matching client credentials token if no result was found.', async(): Promise<void> => {
    await expect(adapter.find('id')).resolves.toBeUndefined();
    expect(sourceAdapter.find).toHaveBeenCalledTimes(1);
    expect(sourceAdapter.find).toHaveBeenLastCalledWith('id');
    expect(credentialsStore.get).toHaveBeenCalledTimes(1);
    expect(credentialsStore.get).toHaveBeenLastCalledWith('id');
    expect(accountStore.get).toHaveBeenCalledTimes(0);
  });

  it('returns no result if there is no matching account.', async(): Promise<void> => {
    accountStore.get.mockResolvedValueOnce(undefined);
    credentialsStore.get.mockResolvedValue({ secret: 'super_secret', webId: 'http://example.com/foo#me', accountId: 'accountId' });
    await expect(adapter.find('id')).resolves.toBeUndefined();
    expect(sourceAdapter.find).toHaveBeenCalledTimes(1);
    expect(sourceAdapter.find).toHaveBeenLastCalledWith('id');
    expect(credentialsStore.get).toHaveBeenCalledTimes(1);
    expect(credentialsStore.get).toHaveBeenLastCalledWith('id');
    expect(accountStore.get).toHaveBeenCalledTimes(1);
    expect(accountStore.get).toHaveBeenLastCalledWith('accountId');
  });

  it('returns no result if the WebID is not linked to the account and deletes the token.', async(): Promise<void> => {
    const account = createAccount();
    accountStore.get.mockResolvedValueOnce(account);
    credentialsStore.get.mockResolvedValue({ secret: 'super_secret', webId: 'http://example.com/foo#me', accountId: 'accountId' });
    await expect(adapter.find('id')).resolves.toBeUndefined();
    expect(sourceAdapter.find).toHaveBeenCalledTimes(1);
    expect(sourceAdapter.find).toHaveBeenLastCalledWith('id');
    expect(credentialsStore.get).toHaveBeenCalledTimes(1);
    expect(credentialsStore.get).toHaveBeenLastCalledWith('id');
    expect(accountStore.get).toHaveBeenCalledTimes(1);
    expect(accountStore.get).toHaveBeenLastCalledWith('accountId');
    expect(credentialsStore.delete).toHaveBeenCalledTimes(1);
    expect(credentialsStore.delete).toHaveBeenLastCalledWith('id', account);
  });

  it('returns valid client_credentials Client metadata if a matching token was found.', async(): Promise<void> => {
    const webId = 'http://example.com/foo#me';
    const account = createAccount();
    account.webIds[webId] = 'resource';
    accountStore.get.mockResolvedValueOnce(account);
    credentialsStore.get.mockResolvedValue({ secret: 'super_secret', webId, accountId: 'accountId' });
    /* eslint-disable @typescript-eslint/naming-convention */
    await expect(adapter.find('id')).resolves.toEqual({
      client_id: 'id',
      client_secret: 'super_secret',
      grant_types: [ 'client_credentials' ],
      redirect_uris: [],
      response_types: [],
    });
    /* eslint-enable @typescript-eslint/naming-convention */
    expect(sourceAdapter.find).toHaveBeenCalledTimes(1);
    expect(sourceAdapter.find).toHaveBeenLastCalledWith('id');
    expect(credentialsStore.get).toHaveBeenCalledTimes(1);
    expect(credentialsStore.get).toHaveBeenLastCalledWith('id');
    expect(accountStore.get).toHaveBeenCalledTimes(1);
    expect(accountStore.get).toHaveBeenLastCalledWith('accountId');
  });
});
