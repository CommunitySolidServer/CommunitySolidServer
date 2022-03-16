import type { AdapterPayload, Adapter } from 'oidc-provider';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { AdapterFactory } from '../../storage/AdapterFactory';
import { PassthroughAdapterFactory, PassthroughAdapter } from '../../storage/PassthroughAdapterFactory';
import type { AccountStore } from '../account/util/AccountStore';
import type { ClientCredentialsStore } from './util/ClientCredentialsStore';

/**
 * A {@link PassthroughAdapter} that overrides the `find` function
 * by checking if there are stored client credentials for the given ID
 * if no payload is found in the source.
 */
export class ClientCredentialsAdapter extends PassthroughAdapter {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;
  private readonly clientCredentialsStore: ClientCredentialsStore;

  public constructor(name: string, source: Adapter, accountStore: AccountStore,
    clientCredentialsStore: ClientCredentialsStore) {
    super(name, source);
    this.accountStore = accountStore;
    this.clientCredentialsStore = clientCredentialsStore;
  }

  public async find(id: string): Promise<AdapterPayload | void | undefined> {
    let payload = await this.source.find(id);

    if (!payload && this.name === 'Client') {
      const credentials = await this.clientCredentialsStore.get(id);
      if (credentials) {
        // Make sure the WebID is still linked to the account.
        // Unlinking a WebID does not necessarily delete the corresponding credential tokens.
        const account = await this.accountStore.get(credentials.accountId);
        if (!account) {
          this.logger.error(`Storage contains credentials ${id} with unknown account ID ${credentials.accountId}`);
          return;
        }

        if (!account.webIds[credentials.webId]) {
          this.logger.warn(
            `Client credentials token ${id} contains WebID that is no longer linked to the account. Removing...`,
          );
          await this.clientCredentialsStore.delete(id, account);
          return;
        }

        this.logger.debug(`Authenticating as ${credentials.webId} using client credentials`);

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
  private readonly accountStore: AccountStore;
  private readonly clientCredentialsStore: ClientCredentialsStore;

  public constructor(source: AdapterFactory, accountStore: AccountStore,
    clientCredentialsStore: ClientCredentialsStore) {
    super(source);
    this.accountStore = accountStore;
    this.clientCredentialsStore = clientCredentialsStore;
  }

  public createStorageAdapter(name: string): Adapter {
    const adapter = this.source.createStorageAdapter(name);
    return new ClientCredentialsAdapter(name, adapter, this.accountStore, this.clientCredentialsStore);
  }
}
