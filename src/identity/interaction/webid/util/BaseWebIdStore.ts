import { createHash } from 'crypto';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { KeyValueStorage } from '../../../../storage/keyvalue/KeyValueStorage';
import { BadRequestHttpError } from '../../../../util/errors/BadRequestHttpError';
import type { Account } from '../../account/util/Account';
import type { AccountStore } from '../../account/util/AccountStore';
import { safeUpdate } from '../../account/util/AccountUtil';
import type { WebIdLinkRoute } from '../WebIdLinkRoute';
import type { WebIdStore } from './WebIdStore';

/**
 * A {@link WebIdStore} using a {@link KeyValueStorage} to store the links.
 * Keys of the storage are WebIDs, values all the account IDs they are linked to.
 */
export class BaseWebIdStore implements WebIdStore {
  private readonly logger = getLoggerFor(this);

  private readonly webIdRoute: WebIdLinkRoute;
  private readonly accountStore: AccountStore;
  private readonly storage: KeyValueStorage<string, string[]>;

  public constructor(webIdRoute: WebIdLinkRoute, accountStore: AccountStore,
    storage: KeyValueStorage<string, string[]>) {
    this.webIdRoute = webIdRoute;
    this.accountStore = accountStore;
    this.storage = storage;
  }

  public async get(webId: string): Promise<string[]> {
    return await this.storage.get(webId) ?? [];
  }

  public async add(webId: string, account: Account): Promise<string> {
    const accounts = await this.storage.get(webId) ?? [];

    if (account.webIds[webId]) {
      this.logger.warn(`Trying to link WebID ${webId} which is already linked to this account ${account.id}`);
      throw new BadRequestHttpError(`${webId} is already registered to this account.`);
    }

    if (!accounts.includes(account.id)) {
      accounts.push(account.id);
    }

    const webIdLink = createHash('sha256').update(webId).digest('hex');
    const resource = this.webIdRoute.getPath({ accountId: account.id, webIdLink });
    account.webIds[webId] = resource;

    await safeUpdate(account,
      this.accountStore,
      async(): Promise<any> => this.storage.set(webId, accounts));

    this.logger.debug(`Linked WebID ${webId} to account ${account.id}`);

    return resource;
  }

  public async delete(webId: string, account: Account): Promise<void> {
    let accounts = await this.storage.get(webId) ?? [];

    if (accounts.includes(account.id)) {
      accounts = accounts.filter((id): boolean => id !== account.id);
      delete account.webIds[webId];

      await safeUpdate(account,
        this.accountStore,
        async(): Promise<any> => accounts.length === 0 ?
          this.storage.delete(webId) :
          this.storage.set(webId, accounts));

      this.logger.debug(`Deleted WebID ${webId} from account ${account.id}`);
    }
  }
}
