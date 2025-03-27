import type {
  IndexObject,
  StringKey,
  TypeObject,
  ValueTypeDescription,
} from '../../../../storage/keyvalue/IndexedStorage';
import type { ACCOUNT_TYPE } from './LoginStorage';

/**
 * Settings parameter used to determine if the user wants the login to be remembered.
 */
export const ACCOUNT_SETTINGS_REMEMBER_LOGIN = 'rememberLogin';

export type GenericAccountSettings = Record<string, ValueTypeDescription<typeof ACCOUNT_TYPE> & `${string}?`>;

/**
 * The index type description of the minimal account settings.
 */
export type MinimalAccountSettings = { [ACCOUNT_SETTINGS_REMEMBER_LOGIN]: 'boolean?' };

/**
 * The JS object representation of the minimal account settings.
 */
export type AccountSettings = IndexObject<MinimalAccountSettings>;

/**
 * Used to store account data.
 */
export interface AccountStore<TSettings extends GenericAccountSettings = MinimalAccountSettings> {
  /**
   * Creates a new and empty account.
   * Since this account will not yet have a login method,
   * implementations should restrict what is possible with this account,
   * and should potentially have something in place to clean these accounts up if they are unused.
   */
  create: () => Promise<string>;

  /**
   * Finds the setting of the account with the given identifier.
   * Returns undefined if there is no matching account.
   *
   * @param id - The account identifier.
   * @param setting - The setting to find the value of.
   */
  getSetting: <TKey extends keyof TSettings>(id: string, setting: TKey)
  => Promise<TypeObject<TSettings>[TKey] | undefined>;

  /**
   * Updates the settings for the account with the given identifier to the new values.
   *
   * @param id - The account identifier.
   * @param setting - The setting to update.
   * @param value - The new value for the setting.
   */
  updateSetting: <TKey extends StringKey<TSettings>>(id: string, setting: TKey, value: TypeObject<TSettings>[TKey])
  => Promise<void>;
}
