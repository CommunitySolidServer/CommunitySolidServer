/**
 * Stores and updates WebID to Account links.
 */
export interface WebIdStore {
  /**
   * Finds the account and WebID of the link with the given ID.
   *
   * @param webId - ID of the link.
   */
  get: (linkId: string) => Promise<{ accountId: string; webId: string } | undefined>;

  /**
   * Determines if a WebID is linked to an account.
   *
   * @param webId - WebID to check.
   * @param accountId - ID of the account.
   */
  isLinked: (webId: string, accountId: string) => Promise<boolean>;

  /**
   * Finds all links associated with the given account.
   *
   * @param accountId - ID of the account.
   */
  findLinks: (accountId: string) => Promise<{ id: string; webId: string }[]>;

  /**
   * Creates a new WebID link for the given WebID and account.
   *
   * @param webId - WebID to link.
   * @param account - ID of the account to link the WebID to.
   *
   * @returns ID of the link.
   */
  create: (webId: string, accountId: string) => Promise<string>;

  /**
   * Deletes the link with the given ID
   *
   * @param linkId - ID of the link.
   */
  delete: (linkId: string) => Promise<void>;
}
