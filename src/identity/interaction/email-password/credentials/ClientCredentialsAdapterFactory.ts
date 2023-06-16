import type { AdapterPayload, Adapter } from '../../../../../templates/types/oidc-provider';
import type { KeyValueStorage } from '../../../../storage/keyvalue/KeyValueStorage';
import type { AdapterFactory } from '../../../storage/AdapterFactory';
import { PassthroughAdapterFactory, PassthroughAdapter } from '../../../storage/PassthroughAdapterFactory';

export interface ClientCredentials {
  secret: string;
  webId: string;
}

/**
 * A {@link PassthroughAdapter} that overrides the `find` function
 * by checking if there are stored client credentials for the given ID
 * if no payload is found in the source.
 */
export class ClientCredentialsAdapter extends PassthroughAdapter {
  private readonly storage: KeyValueStorage<string, ClientCredentials>;

  public constructor(name: string, source: Adapter, storage: KeyValueStorage<string, ClientCredentials>) {
    super(name, source);
    this.storage = storage;
  }

  public async find(id: string): Promise<AdapterPayload | void | undefined> {
    let payload = await this.source.find(id);

    if (!payload && this.name === 'Client') {
      const credentials = await this.storage.get(id);
      if (credentials) {
        /* eslint-disable @typescript-eslint/naming-convention */
        payload = {
          client_id: id,
          client_secret: credentials.secret,
          grant_types: [ 'client_credentials' ],
          redirect_uris: [],
          response_types: [],
        };
        /* eslint-enable @typescript-eslint/naming-convention */
      }
    }
    return payload;
  }
}

export class ClientCredentialsAdapterFactory extends PassthroughAdapterFactory {
  private readonly storage: KeyValueStorage<string, ClientCredentials>;

  public constructor(source: AdapterFactory, storage: KeyValueStorage<string, ClientCredentials>) {
    super(source);
    this.storage = storage;
  }

  public createStorageAdapter(name: string): Adapter {
    return new ClientCredentialsAdapter(name, this.source.createStorageAdapter(name), this.storage);
  }
}
