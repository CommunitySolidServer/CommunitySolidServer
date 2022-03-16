import type { Account } from './Account';

/**
 * Used to store account data.
 */
export interface AccountStore {
  /**
   * Creates a new and completely empty account.
   * Since this account will not yet have a login method,
   * implementations should restrict what is possible with this account,
   * and should potentially have something in place to clean these accounts up if they are unused.
   */
  create: () => Promise<Account>;
  /**
   * Finds the account with the given identifier.
   * @param id - The account identifier.
   */
  get: (id: string) => Promise<Account | undefined>;
  /**
   * Updates the account with the given values.
   * The account will be completely overwritten with the provided {@link Account} object.
   *
   * It should not be possible to update an account to have no login methods.
   *
   * @param account - The new values for the account.
   */
  update: (account: Account) => Promise<void>;
}
