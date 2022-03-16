import type { Account } from '../../account/util/Account';

/**
 * Stores and updates WebID to Account links.
 */
export interface WebIdStore {
  /**
   * Finds all account IDs that are linked to the given WebID.
   *
   * @param webId - WebID to find account IDs for.
   */
  get: (webId: string) => Promise<string[]>;
  /**
   * Adds the given account ID to the WebID.
   * Updates the account accordingly.
   *
   * @param webId - WebID to link to.
   * @param account - Account to link to the WebID. Will be updated in place.
   *
   * @returns The resource corresponding to the created link for this account.
   */
  add: (webId: string, account: Account) => Promise<string>;
  /**
   * Deletes the link between the given WebID and account.
   * Updates the account accordingly.
   *
   * @param webId - WebID to remove the link from.
   * @param account - Account to unlink from the WebID. Will be updated in place.
   */
  delete: (webId: string, account: Account) => Promise<void>;
}
