export interface JwtAssertion {
  id: string;
  client: string;
  agent: string;
  accountId: string;
}

/**
 * Stores and creates {@link JwtAssertion}.
 */
export interface JwtAssertionsStore {
  /**
   * Find the {@link JwtAssertion} with the given ID.
   *
   * @param id - ID of the token.
   */
  get: (id: string) => Promise<JwtAssertion | undefined>;

  /**
   * Find the {@link JwtAssertion} given its JWT representation.
   *
   * @param id - ID of the token.
   */
  findByJwt: (id: string) => Promise<JwtAssertion | undefined>;

  /**
   * Find all tokens created by the given account.
   *
   * @param accountId - ID of the account.
   */
  findByAccount: (accountId: string) => Promise<JwtAssertion[]>;

  /**
   * Creates new token.
   *
   * @param clientId - Identifier to use for the new token.
   * @param webId - WebID to identify as when using this token.
   * @param account - Account that is associated with this token.
   * @param assertion - JWT assertion
   */
  create: (clientId: string, webId: string, accountId: string) => Promise<{ id: string; assertion: string }>;

  /**
   * Deletes the token with the given ID.
   *
   * @param id - ID of the token.
   */
  delete: (id: string) => Promise<void>;
}
