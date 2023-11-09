import type { Adapter } from 'oidc-provider';
import {
  ClientCredentialsAdapter,
  ClientCredentialsAdapterFactory,
} from '../../../../../src/identity/interaction/client-credentials/ClientCredentialsAdapterFactory';
import type {
  ClientCredentials,
  ClientCredentialsStore,
} from '../../../../../src/identity/interaction/client-credentials/util/ClientCredentialsStore';
import type { WebIdStore } from '../../../../../src/identity/interaction/webid/util/WebIdStore';
import type { AdapterFactory } from '../../../../../src/identity/storage/AdapterFactory';

describe('A ClientCredentialsAdapterFactory', (): void => {
  const webId = 'http://example.com/card#me';
  const id = '123456';
  const accountId = 'accountId;';
  const label = 'token_123';
  const secret = 'secret!';
  const token: ClientCredentials = { id, label, secret, accountId, webId };
  let webIdStore: jest.Mocked<WebIdStore>;
  let credentialsStore: jest.Mocked<ClientCredentialsStore>;
  let sourceAdapter: jest.Mocked<Adapter>;
  let sourceFactory: jest.Mocked<AdapterFactory>;
  let adapter: ClientCredentialsAdapter;
  let factory: ClientCredentialsAdapterFactory;

  beforeEach(async(): Promise<void> => {
    sourceAdapter = {
      find: jest.fn(),
    } satisfies Partial<Adapter> as any;

    sourceFactory = {
      createStorageAdapter: jest.fn().mockReturnValue(sourceAdapter),
    };

    webIdStore = {
      isLinked: jest.fn().mockResolvedValue(true),
    } satisfies Partial<WebIdStore> as any;

    credentialsStore = {
      findByLabel: jest.fn().mockResolvedValue(token),
      delete: jest.fn(),
    } satisfies Partial<ClientCredentialsStore> as any;

    adapter = new ClientCredentialsAdapter('Client', sourceAdapter, webIdStore, credentialsStore);
    factory = new ClientCredentialsAdapterFactory(sourceFactory, webIdStore, credentialsStore);
  });

  it('calls the source factory when creating a new Adapter.', async(): Promise<void> => {
    expect(factory.createStorageAdapter('Name')).toBeInstanceOf(ClientCredentialsAdapter);
    expect(sourceFactory.createStorageAdapter).toHaveBeenCalledTimes(1);
    expect(sourceFactory.createStorageAdapter).toHaveBeenLastCalledWith('Name');
  });

  it('returns the result from the source.', async(): Promise<void> => {
    sourceAdapter.find.mockResolvedValue({ payload: 'payload' });
    await expect(adapter.find(label)).resolves.toEqual({ payload: 'payload' });
    expect(sourceAdapter.find).toHaveBeenCalledTimes(1);
    expect(sourceAdapter.find).toHaveBeenLastCalledWith(label);
    expect(credentialsStore.findByLabel).toHaveBeenCalledTimes(0);
  });

  it('returns no result if there is no token for the label.', async(): Promise<void> => {
    credentialsStore.findByLabel.mockResolvedValueOnce(undefined);
    await expect(adapter.find(label)).resolves.toBeUndefined();
    expect(sourceAdapter.find).toHaveBeenCalledTimes(1);
    expect(sourceAdapter.find).toHaveBeenLastCalledWith(label);
    expect(credentialsStore.findByLabel).toHaveBeenCalledTimes(1);
    expect(credentialsStore.findByLabel).toHaveBeenLastCalledWith(label);
  });

  it('returns no result if the WebID is not linked to the account and deletes the token.', async(): Promise<void> => {
    webIdStore.isLinked.mockResolvedValueOnce(false);
    await expect(adapter.find(label)).resolves.toBeUndefined();
    expect(sourceAdapter.find).toHaveBeenCalledTimes(1);
    expect(sourceAdapter.find).toHaveBeenLastCalledWith(label);
    expect(credentialsStore.findByLabel).toHaveBeenCalledTimes(1);
    expect(credentialsStore.findByLabel).toHaveBeenLastCalledWith(label);
    expect(credentialsStore.delete).toHaveBeenCalledTimes(1);
    expect(credentialsStore.delete).toHaveBeenLastCalledWith(id);
  });

  it('returns valid client_credentials Client metadata if a matching token was found.', async(): Promise<void> => {
    await expect(adapter.find(label)).resolves.toEqual({
      client_id: label,
      client_secret: secret,
      grant_types: [ 'client_credentials' ],
      redirect_uris: [],
      response_types: [],
    });

    expect(sourceAdapter.find).toHaveBeenCalledTimes(1);
    expect(sourceAdapter.find).toHaveBeenLastCalledWith(label);
    expect(credentialsStore.findByLabel).toHaveBeenCalledTimes(1);
    expect(credentialsStore.findByLabel).toHaveBeenLastCalledWith(label);
  });
});
