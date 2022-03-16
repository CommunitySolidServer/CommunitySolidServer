/**
 * The constant used to identify email/password based login combinations in the map of logins an account has.
 */
export const PASSWORD_METHOD = 'password';

/**
 * Responsible for storing everything related to email/password based login combinations.
 */
export interface PasswordStore {
  /**
   * Finds the Account ID linked to this email address.
   * @param email - The email address of which to find the account.
   * @returns The relevant Account ID or `undefined` if there is no match.
   */
  get: (email: string) => Promise<string | undefined>;

  /**
   * Authenticate if the email and password are correct and return the Account ID if it is.
   * Throw an error if it is not.
   * @param email - The user's email.
   * @param password - This user's password.
   * @returns The user's Account ID.
   */
  authenticate: (email: string, password: string) => Promise<string>;

  /**
   * Stores a new login entry for this account.
   * @param email - Account email.
   * @param accountId - Account ID.
   * @param password - Account password.
   */
  create: (email: string, accountId: string, password: string) => Promise<void>;

  /**
   * Confirms that the e-mail address has been verified. This can be used with, for example, email verification.
   * The login can only be used after it is verified.
   * In case verification is not required, this should be called immediately after the `create` call.
   * @param email - The account email.
   */
  confirmVerification: (email: string) => Promise<void>;

  /**
   * Changes the password.
   * @param email - The user's email.
   * @param password - The user's password.
   */
  update: (email: string, password: string) => Promise<void>;

  /**
   * Delete the login entry of this email address.
   * @param email - The user's email.
   */
  delete: (email: string) => Promise<boolean>;
}
