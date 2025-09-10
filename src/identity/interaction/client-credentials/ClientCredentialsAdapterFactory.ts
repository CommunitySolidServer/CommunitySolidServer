import { getLoggerFor } from 'global-logger-factory';
import type { Adapter, AdapterPayload } from 'oidc-provider';
import type { AdapterFactory } from '../../storage/AdapterFactory';
import { PassthroughAdapter, PassthroughAdapterFactory } from '../../storage/PassthroughAdapterFactory';
import type { WebIdStore } from '../webid/util/WebIdStore';
import type { ClientCredentialsStore } from './util/ClientCredentialsStore';

/**
 * A {@link PassthroughAdapter} that overrides the `find` function
 * by checking if there are stored client credentials for the given ID
 * if no payload is found in the source.
 */
export class ClientCredentialsAdapter extends PassthroughAdapter {
  protected readonly logger = getLoggerFor(this);

  private readonly webIdStore: WebIdStore;
  private readonly clientCredentialsStore: ClientCredentialsStore;

  public constructor(
    name: string,
    source: Adapter,
    webIdStore: WebIdStore,
    clientCredentialsStore: ClientCredentialsStore,
  ) {
    super(name, source);
    this.webIdStore = webIdStore;
    this.clientCredentialsStore = clientCredentialsStore;
  }

  public async find(label: string): Promise<AdapterPayload | void | undefined> {
    let payload = await this.source.find(label);

    if (!payload && this.name === 'Client') {
      const credentials = await this.clientCredentialsStore.findByLabel(label);
      if (!credentials) {
        return payload;
      }

      // Make sure the WebID wasn't unlinked in the meantime
      const valid = await this.webIdStore.isLinked(credentials.webId, credentials.accountId);
      if (!valid) {
        this.logger.error(
          `Client credentials token ${label} contains WebID that is no longer linked to the account. Removing...`,
        );
        await this.clientCredentialsStore.delete(credentials.id);
        return payload;
      }

      this.logger.debug(`Authenticating as ${credentials.webId} using client credentials`);

      /* eslint-disable ts/naming-convention */
      payload = {
        client_id: label,
        client_secret: credentials.secret,
        grant_types: [ 'client_credentials' ],
        redirect_uris: [],
        response_types: [],
      };
      /* eslint-enable ts/naming-convention */
    }
    return payload;
  }
}

export class ClientCredentialsAdapterFactory extends PassthroughAdapterFactory {
  private readonly webIdStore: WebIdStore;
  private readonly clientCredentialsStore: ClientCredentialsStore;

  public constructor(source: AdapterFactory, webIdStore: WebIdStore, clientCredentialsStore: ClientCredentialsStore) {
    super(source);
    this.webIdStore = webIdStore;
    this.clientCredentialsStore = clientCredentialsStore;
  }

  public createStorageAdapter(name: string): Adapter {
    const adapter = this.source.createStorageAdapter(name);
    return new ClientCredentialsAdapter(name, adapter, this.webIdStore, this.clientCredentialsStore);
  }
}
