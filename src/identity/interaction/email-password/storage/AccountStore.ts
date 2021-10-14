/**
 * Options that can be set on an account.
 */
export interface AccountSettings {
  /**
   * If this account can be used to identify as the corresponding WebID in the IDP.
   */
  useIdp: boolean;
  /**
   * The base URL of the pod associated with this account, if there is one.
   */
  podBaseUrl?: string;
}

/**
 * Storage needed for the email-password interaction
 */
export interface AccountStore {
  /**
   * Authenticate if the username and password are correct and return the WebID
   * if it is. Throw an error if it is not.
   * @param email - The user's email.
   * @param password - This user's password.
   * @returns The user's WebID.
   */
  authenticate: (email: string, password: string) => Promise<string>;

  /**
   * Creates a new account.
   * @param email - Account email.
   * @param webId - Account WebID.
   * @param password - Account password.
   * @param settings - Specific settings for the account.
   */
  create: (email: string, webId: string, password: string, settings: AccountSettings) => Promise<void>;

  /**
   * Verifies the account creation. This can be used with, for example, e-mail verification.
   * The account can only be used after it is verified.
   * In case verification is not required, this should be called immediately after the `create` call.
   * @param email - The account email.
   */
  verify: (email: string) => Promise<void>;

  /**
   * Changes the password.
   * @param email - The user's email.
   * @param password - The user's password.
   */
  changePassword: (email: string, password: string) => Promise<void>;

  /**
   * Gets the settings associated with this account.
   * Errors if there is no matching account.
   * @param webId - The account WebID.
   */
  getSettings: (webId: string) => Promise<AccountSettings>;

  /**
   * Updates the settings associated with this account.
   * @param webId - The account WebID.
   * @param settings - New settings for the account.
   */
  updateSettings: (webId: string, settings: AccountSettings) => Promise<void>;

  /**
   * Delete the account.
   * @param email - The user's email.
   */
  deleteAccount: (email: string) => Promise<void>;

  /**
   * Creates a Forgot Password Confirmation Record. This will be to remember that
   * a user has made a request to reset a password. Throws an error if the email doesn't
   * exist
   * @param email - The user's email.
   * @returns The record id. This should be included in the reset password link.
   */
  generateForgotPasswordRecord: (email: string) => Promise<string>;

  /**
   * Gets the email associated with the forgot password confirmation record or undefined
   * if it's not present
   * @param recordId - The record id retrieved from the link.
   * @returns The user's email.
   */
  getForgotPasswordRecord: (recordId: string) => Promise<string | undefined>;

  /**
   * Deletes the Forgot Password Confirmation Record
   * @param recordId - The record id of the forgot password confirmation record.
   */
  deleteForgotPasswordRecord: (recordId: string) => Promise<void>;
}
