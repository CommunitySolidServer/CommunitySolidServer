import { randomBytes } from 'crypto';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { KeyValueStorage } from '../../../../storage/keyvalue/KeyValueStorage';
import { BadRequestHttpError } from '../../../../util/errors/BadRequestHttpError';
import type { Account } from '../../account/util/Account';
import type { AccountStore } from '../../account/util/AccountStore';
import { safeUpdate } from '../../account/util/AccountUtil';
import type { ClientCredentialsIdRoute } from './ClientCredentialsIdRoute';
import type { ClientCredentials, ClientCredentialsStore } from './ClientCredentialsStore';

/**
 * A {@link ClientCredentialsStore} that uses a {@link KeyValueStorage} for storing the tokens.
 */
export class BaseClientCredentialsStore implements ClientCredentialsStore {
  private readonly logger = getLoggerFor(this);

  private readonly clientCredentialsRoute: ClientCredentialsIdRoute;
  private readonly accountStore: AccountStore;
  private readonly storage: KeyValueStorage<string, ClientCredentials>;

  public constructor(clientCredentialsRoute: ClientCredentialsIdRoute, accountStore: AccountStore,
    storage: KeyValueStorage<string, ClientCredentials>) {
    this.clientCredentialsRoute = clientCredentialsRoute;
    this.accountStore = accountStore;
    this.storage = storage;
  }

  public async get(id: string): Promise<ClientCredentials | undefined> {
    return this.storage.get(id);
  }

  public async add(id: string, webId: string, account: Account): Promise<{ secret: string; resource: string }> {
    if (typeof account.webIds[webId] !== 'string') {
      this.logger.warn(`Trying to create token for ${webId} which does not belong to account ${account.id}`);
      throw new BadRequestHttpError('WebID does not belong to this account.');
    }

    const secret = randomBytes(64).toString('hex');
    const resource = this.clientCredentialsRoute.getPath({ accountId: account.id, clientCredentialsId: id });

    account.clientCredentials[id] = resource;
    await safeUpdate(account,
      this.accountStore,
      (): Promise<any> => this.storage.set(id, { accountId: account.id, secret, webId }));

    this.logger.debug(`Created client credentials token ${id} for WebID ${webId} and account ${account.id}`);

    return { secret, resource };
  }

  public async delete(id: string, account: Account): Promise<void> {
    const link = account.clientCredentials[id];

    if (link) {
      delete account.clientCredentials[id];
      await safeUpdate(account,
        this.accountStore,
        (): Promise<any> => this.storage.delete(id));

      this.logger.debug(`Deleted client credentials token ${id} for account ${account.id}`);
    }
  }
}
