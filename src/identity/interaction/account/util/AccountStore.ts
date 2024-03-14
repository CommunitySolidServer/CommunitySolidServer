/**
 * Settings parameter used to determine if the user wants the login to be remembered.
 */
export const ACCOUNT_SETTINGS_REMEMBER_LOGIN = 'rememberLogin';

export type AccountSettings = { [ACCOUNT_SETTINGS_REMEMBER_LOGIN]?: boolean };

/**
 * Used to store account data.
 */
export interface AccountStore {
  /**
   * Creates a new and empty account.
   * Since this account will not yet have a login method,
   * implementations should restrict what is possible with this account,
   * and should potentially have something in place to clean these accounts up if they are unused.
   */
  create: () => Promise<string>;

  /**
   * Finds the setting of the account with the given identifier.
   *
   * @param id - The account identifier.
   * @param setting - The setting to find the value of.
   */
  getSetting: <T extends keyof AccountSettings>(id: string, setting: T) => Promise<AccountSettings[T]>;

  /**
   * Updates the settings for the account with the given identifier to the new values.
   *
   * @param id - The account identifier.
   * @param setting - The setting to update.
   * @param value - The new value for the setting.
   */
  updateSetting: <T extends keyof AccountSettings>(id: string, setting: T, value: AccountSettings[T]) => Promise<void>;
}
