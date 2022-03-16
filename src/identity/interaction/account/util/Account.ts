import type { Json } from '../../InteractionUtil';
import Dict = NodeJS.Dict;

/**
 * Settings parameter used to determine if the user wants the login to be remembered.
 */
export const ACCOUNT_SETTINGS_REMEMBER_LOGIN = 'rememberLogin';

/**
 * Object used to keep track of all the relevant account data.
 * All key/value objects stored in this are expected to have the same similar structure:
 * the keys should be the unique value relevant for that type of data,
 * while the values should be the URL of the corresponding resource that can be used to potentially modify this entry.
 */
export type Account = {
  /**
   * A unique identifier for this account.
   */
  readonly id: string;
  /**
   * All login methods that can be used to identify as this account.
   * As one login method can have multiple entries, this is a nested map.
   * You could have several different e-mail addresses to log in with for example.
   * The keys of the first map are the unique identifiers of the login methods.
   * The keys of the second map are the unique identifiers of the entry within that login method.
   *
   * For example, assume we have a login method `password` that uses e-mail addresses to identify entries,
   * this could look as follows:
   * `{ logins: { password: { ['test@example.com']: 'http://localhost:3000/.account/123/logins/password/123' } } }`.
   *
   * Implementations should make sure it is not possible to have an account without login method,
   * as that would make the account inaccessible.
   */
  readonly logins: Dict<Dict<string>>;
  /**
   * The pods this account is the owner of.
   * The keys are the base URLs of those pods.
   */
  readonly pods: Dict<string>;
  /**
   * All WebIDs registered to this account,
   * meaning this account can identify as any of these WebIDs after logging in.
   * The keys are the actual WebIDs.
   */
  readonly webIds: Dict<string>;
  /**
   * The client credentials stored for this account.
   * The keys are the IDs of the tokens.
   */
  readonly clientCredentials: Dict<string>;
  /**
   * Various settings of the account.
   * This is an open-ended object that can be used for any settings that need to be tracked on an account,
   * hence there are no strict typings on the values.
   */
  readonly settings: Dict<Json>;
};
