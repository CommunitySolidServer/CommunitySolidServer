import {
  ClientCredentialsAdapter,
  ClientCredentialsAdapterFactory,
} from '../../../../../../src/identity/interaction/email-password/credentials/ClientCredentialsAdapterFactory';
import type {
  ClientCredentials,
} from '../../../../../../src/identity/interaction/email-password/credentials/ClientCredentialsAdapterFactory';
import type { AdapterFactory } from '../../../../../../src/identity/storage/AdapterFactory';
import type { KeyValueStorage } from '../../../../../../src/storage/keyvalue/KeyValueStorage';
import type { Adapter } from '../../../../../../templates/types/oidc-provider';

describe('A ClientCredentialsAdapterFactory', (): void => {
  let storage: jest.Mocked<KeyValueStorage<string, ClientCredentials>>;
  let sourceAdapter: jest.Mocked<Adapter>;
  let sourceFactory: jest.Mocked<AdapterFactory>;
  let adapter: ClientCredentialsAdapter;
  let factory: ClientCredentialsAdapterFactory;

  beforeEach(async(): Promise<void> => {
    storage = {
      get: jest.fn(),
    } as any;

    sourceAdapter = {
      find: jest.fn(),
    } as any;

    sourceFactory = {
      createStorageAdapter: jest.fn().mockReturnValue(sourceAdapter),
    };

    adapter = new ClientCredentialsAdapter('Client', sourceAdapter, storage);
    factory = new ClientCredentialsAdapterFactory(sourceFactory, storage);
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
    expect(storage.get).toHaveBeenCalledTimes(0);
  });

  it('tries to find a matching client credentials token if no result was found.', async(): Promise<void> => {
    await expect(adapter.find('id')).resolves.toBeUndefined();
    expect(sourceAdapter.find).toHaveBeenCalledTimes(1);
    expect(sourceAdapter.find).toHaveBeenLastCalledWith('id');
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith('id');
  });

  it('returns valid client_credentials Client metadata if a matching token was found.', async(): Promise<void> => {
    storage.get.mockResolvedValue({ secret: 'super_secret', webId: 'http://example.com/foo#me' });
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
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenLastCalledWith('id');
  });
});
