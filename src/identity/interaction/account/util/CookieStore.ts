/**
 * Used to generate and store cookies.
 */
export interface CookieStore {
  /**
   * Generates and stores a new cookie for the given accountId.
   * This does not replace previously generated cookies.
   *
   * @param accountId - Account to create a cookie for.
   *
   * @returns The generated cookie.
   */
  generate: (accountId: string) => Promise<string>;

  /**
   * Return the accountID associated with the given cookie.
   *
   * @param cookie - Cookie to find the account for.
   */
  get: (cookie: string) => Promise<string | undefined>;

  /**
   * Refreshes the cookie expiration and returns when it will expire if the cookie exists.
   *
   * @param cookie - Cookie to refresh.
   */
  refresh: (cookie: string) => Promise<Date | undefined>;

  /**
   * Deletes the given cookie.
   *
   * @param cookie - Cookie to delete.
   */
  delete: (cookie: string) => Promise<boolean>;
}
