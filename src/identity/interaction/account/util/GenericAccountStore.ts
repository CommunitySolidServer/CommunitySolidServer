import { Initializer } from '../../../../init/Initializer';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type {
  CreateTypeObject,
  StringKey,
  TypeObject,
} from '../../../../storage/keyvalue/IndexedStorage';
import { createErrorMessage } from '../../../../util/errors/ErrorUtil';
import { InternalServerError } from '../../../../util/errors/InternalServerError';
import type { AccountStore, MinimalAccountSettings } from './AccountStore';
import type { AccountLoginStorage } from './LoginStorage';
import { ACCOUNT_TYPE } from './LoginStorage';

/**
 * A {@link AccountStore} that uses an {@link AccountLoginStorage} to keep track of the accounts.
 * Needs to be initialized before it can be used.
 */
export class GenericAccountStore<TDesc extends MinimalAccountSettings>
  extends Initializer implements AccountStore<TDesc> {
  protected readonly logger = getLoggerFor(this);

  protected readonly description: TDesc;
  protected readonly storage: AccountLoginStorage<{ [ACCOUNT_TYPE]: TDesc }>;
  protected initialized = false;

  // Wrong typings to prevent Components.js typing issues
  public constructor(storage: AccountLoginStorage<Record<string, never>>, description: TDesc) {
    super();
    this.description = description;
    this.storage = storage as unknown as typeof this.storage;
  }

  // Initialize the type definitions
  public async handle(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      await this.storage.defineType(ACCOUNT_TYPE, this.description, false);
      this.initialized = true;
    } catch (cause: unknown) {
      throw new InternalServerError(`Error defining account in storage: ${createErrorMessage(cause)}`, { cause });
    }
  }

  public async create(): Promise<string> {
    // {} is valid as only optional fields are allowed in the description
    const { id } = await this.storage.create(ACCOUNT_TYPE, {} as CreateTypeObject<TDesc>);
    this.logger.debug(`Created new account ${id}`);

    return id;
  }

  public async getSetting<TKey extends keyof TDesc>(id: string, setting: TKey):
  Promise<TypeObject<TDesc>[TKey] | undefined> {
    const account = await this.storage.get(ACCOUNT_TYPE, id);
    if (!account) {
      return;
    }
    return account[setting];
  }

  public async updateSetting<TKey extends StringKey<TDesc>>(id: string, setting: TKey, value: TypeObject<TDesc>[TKey]):
  Promise<void> {
    await this.storage.setField(ACCOUNT_TYPE, id, setting, value);
  }
}
