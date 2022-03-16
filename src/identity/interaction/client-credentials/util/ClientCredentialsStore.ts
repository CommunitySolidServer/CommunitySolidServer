import type { Account } from '../../account/util/Account';

/**
 * A client credentials token.
 * If at some point the WebID is no longer registered to the account stored in this token,
 * the token should be invalidated.
 */
export interface ClientCredentials {
  /**
   * The identifier of the account that created the token.
   */
  accountId: string;
  /**
   * The secret of the token.
   */
  secret: string;
  /**
   * The WebID users will be identified as after using the token.
   */
  webId: string;
}

/**
 * Stores and creates {@link ClientCredentials}.
 */
export interface ClientCredentialsStore {
  /**
   * Find the {@link ClientCredentials} with the given label. Undefined if there is no match.
   * @param label - Label of the credentials.
   */
  get: (label: string) => Promise<ClientCredentials | undefined>;
  /**
   * Creates new {@link ClientCredentials} and adds a reference to the account.
   * Will error if the WebID is not registered to the account.
   *
   * @param label - Identifier to use for the new credentials.
   * @param webId - WebID to identify as when using this token.
   * @param account - Account that is associated with this token.
   */
  add: (label: string, webId: string, account: Account) => Promise<{ secret: string; resource: string }>;
  /**
   * Deletes the token with the given identifier and removes the reference from the account.
   * @param label - Identifier of the token.
   * @param account - Account this token belongs to.
   */
  delete: (label: string, account: Account) => Promise<void>;
}
