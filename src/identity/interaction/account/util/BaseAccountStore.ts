import { Initializer } from '../../../../init/Initializer';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { ValueType } from '../../../../storage/keyvalue/IndexedStorage';
import { createErrorMessage } from '../../../../util/errors/ErrorUtil';
import { InternalServerError } from '../../../../util/errors/InternalServerError';
import type { AccountStore, AccountSettings } from './AccountStore';
import { ACCOUNT_SETTINGS_REMEMBER_LOGIN } from './AccountStore';
import type { AccountLoginStorage } from './LoginStorage';
import { ACCOUNT_TYPE } from './LoginStorage';

const STORAGE_DESCRIPTION = {
  [ACCOUNT_SETTINGS_REMEMBER_LOGIN]: 'boolean?',
} as const;

/**
 * A {@link AccountStore} that uses an {@link AccountLoginStorage} to keep track of the accounts.
 * Needs to be initialized before it can be used.
 */
export class BaseAccountStore extends Initializer implements AccountStore {
  private readonly logger = getLoggerFor(this);

  private readonly storage: AccountLoginStorage<{ [ACCOUNT_TYPE]: typeof STORAGE_DESCRIPTION }>;
  private initialized = false;

  public constructor(storage: AccountLoginStorage<any>) {
    super();
    this.storage = storage;
  }

  // Initialize the type definitions
  public async handle(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      await this.storage.defineType(ACCOUNT_TYPE, STORAGE_DESCRIPTION, false);
      this.initialized = true;
    } catch (cause: unknown) {
      throw new InternalServerError(`Error defining account in storage: ${createErrorMessage(cause)}`, { cause });
    }
  }

  public async create(): Promise<string> {
    const { id } = await this.storage.create(ACCOUNT_TYPE, {});
    this.logger.debug(`Created new account ${id}`);

    return id;
  }

  public async getSetting<T extends keyof AccountSettings>(id: string, setting: T): Promise<AccountSettings[T]> {
    const account = await this.storage.get(ACCOUNT_TYPE, id);
    if (!account) {
      return;
    }
    const { id: unused, ...settings } = account;
    return settings[setting];
  }

  public async updateSetting<T extends keyof AccountSettings>(id: string, setting: T, value: AccountSettings[T]):
  Promise<void> {
    await this.storage.setField(ACCOUNT_TYPE, id, setting, value as ValueType<typeof STORAGE_DESCRIPTION[T]>);
  }
}
