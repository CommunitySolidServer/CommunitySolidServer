/**
 * Used to generate and store cookies.
 */
export interface CookieStore {
  /**
   * Generates and stores a new cookie for the given accountId.
   * This does not replace previously generated cookies.
   * @param accountId - Account to create a cookie for.
   */
  generate: (accountId: string) => Promise<string>;
  /**
   * Return the accountID associated with the given cookie.
   * @param cookie - Cookie to find the account for.
   */
  get: (cookie: string) => Promise<string | undefined>;
  /**
   * Deletes the given cookie.
   * @param cookie - Cookie to delete.
   */
  delete: (cookie: string) => Promise<boolean>;
}
