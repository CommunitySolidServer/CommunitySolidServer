export interface ClientCredentials {
  id: string;
  label: string;
  webId: string;
  accountId: string;
  secret: string;
}

/**
 * Stores and creates {@link ClientCredentials}.
 */
export interface ClientCredentialsStore {
  /**
   * Find the {@link ClientCredentials} with the given ID.
   *
   * @param id - ID of the token.
   */
  get: (id: string) => Promise<ClientCredentials | undefined>;

  /**
   * Find the {@link ClientCredentials} with the given label.
   *
   * @param label - Label of the token.
   */
  findByLabel: (label: string) => Promise<ClientCredentials | undefined>;

  /**
   * Find all tokens created by the given account.
   *
   * @param accountId - ID of the account.
   */
  findByAccount: (accountId: string) => Promise<ClientCredentials[]>;

  /**
   * Creates new token.
   *
   * @param label - Identifier to use for the new token.
   * @param webId - WebID to identify as when using this token.
   * @param account - Account that is associated with this token.
   */
  create: (label: string, webId: string, accountId: string) => Promise<ClientCredentials>;

  /**
   * Deletes the token with the given ID.
   *
   * @param id - ID of the token.
   */
  delete: (id: string) => Promise<void>;
}
