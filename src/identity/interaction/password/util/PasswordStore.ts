/**
 * The constant used to identify email/password based login combinations in the map of logins an account has.
 */
export const PASSWORD_METHOD = 'password';

/**
 * Responsible for storing everything related to email/password based login combinations.
 */
export interface PasswordStore {
  /**
   * Creates a new login entry for this account.
   *
   * @param email - Email to log in with.
   * @param accountId - Account ID.
   * @param password - Password to authenticate with.
   */
  create: (email: string, accountId: string, password: string) => Promise<string>;

  /**
   * Finds the account and email associated with this login ID.
   *
   * @param id - The ID of the login object.
   */
  get: (id: string) => Promise<{ email: string; accountId: string } | undefined>;

  /**
   * Finds the account and login ID associated with this email.
   *
   * @param email - Email to find the information for.
   */
  findByEmail: (email: string) => Promise<{ accountId: string; id: string } | undefined>;

  /**
   * Find all login objects created by this account.
   *
   * @param accountId - ID of the account to find the logins for.
   */
  findByAccount: (accountId: string) => Promise<{ id: string; email: string }[]>;

  /**
   * Confirms that the login has been verified.
   * This can be used with, for example, email verification.
   * The login can only be used after it is verified.
   * In case verification is not required, this should be called immediately after the `create` call.
   *
   * @param id - ID of the login.
   */
  confirmVerification: (id: string) => Promise<void>;

  /**
   * Authenticate if the email and password are correct and return the account and login ID if they are.
   * Throw an error if they are not.
   *
   * @param email - The user's email.
   * @param password - This user's password.
   */
  authenticate: (email: string, password: string) => Promise<{ accountId: string; id: string }>;

  /**
   * Changes the password.
   *
   * @param id - ID of the login object.
   * @param password - The new password.
   */
  update: (id: string, password: string) => Promise<void>;

  /**
   * Delete the login entry.
   *
   * @param id - ID of the login object.
   */
  delete: (id: string) => Promise<void>;
}
