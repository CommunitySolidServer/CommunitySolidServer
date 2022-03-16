import { v4 } from 'uuid';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { ExpiringStorage } from '../../../../storage/keyvalue/ExpiringStorage';
import { BadRequestHttpError } from '../../../../util/errors/BadRequestHttpError';
import { NotFoundHttpError } from '../../../../util/errors/NotFoundHttpError';
import type { Account } from './Account';
import type { AccountStore } from './AccountStore';

/**
 * A {@link AccountStore} that uses an {@link ExpiringStorage} to keep track of the accounts.
 * Created accounts will be removed after the chosen expiration in seconds, default 30 minutes,
 * if no login method gets added.
 *
 * New accounts can not be updated unless the update includes at least 1 login method.
 */
export class BaseAccountStore implements AccountStore {
  private readonly logger = getLoggerFor(this);

  private readonly storage: ExpiringStorage<string, Account>;
  private readonly expiration: number;

  public constructor(storage: ExpiringStorage<string, Account>, expiration = 30 * 60) {
    this.storage = storage;
    this.expiration = expiration * 1000;
  }

  public async create(): Promise<Account> {
    const id = v4();
    const account: Account = {
      id,
      logins: {},
      pods: {},
      webIds: {},
      clientCredentials: {},
      settings: {},
    };

    // Expire accounts after some time if no login gets added
    await this.storage.set(id, account, this.expiration);
    this.logger.debug(`Created new account ${id}`);

    return account;
  }

  public async get(id: string): Promise<Account | undefined> {
    return this.storage.get(id);
  }

  public async update(account: Account): Promise<void> {
    const oldAccount = await this.get(account.id);
    // Make sure the account exists
    if (!oldAccount) {
      this.logger.warn(`Trying to update account ${account.id} which does not exist`);
      throw new NotFoundHttpError();
    }

    // Ensure there is at least 1 login method
    const logins = Object.values(account.logins);
    if (!logins.some((specificLogins): boolean => Object.keys(specificLogins ?? {}).length > 0)) {
      this.logger.warn(`Trying to update account ${account.id} without login methods`);
      throw new BadRequestHttpError('An account needs at least 1 login method.');
    }

    // This will disable the expiration if there still was one
    await this.storage.set(account.id, account);

    this.logger.debug(`Updated account ${account.id}`);
  }
}
