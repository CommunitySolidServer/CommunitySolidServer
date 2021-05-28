/**
 * Storage needed for the email-password interaction
 */
export interface AccountStore {
  /**
   * Authenticate if the username and password are correct and return the webId
   * if it is. Return an error if it is not.
   * @param email - the user's email
   * @param password - this user's password
   * @returns The user's WebId
   */
  authenticate: (email: string, password: string) => Promise<string>;

  /**
   * Creates a new account
   * @param email - the account email
   * @param webId - account webId
   * @param password - account password
   */
  create: (email: string, webId: string, password: string) => Promise<void>;

  /**
   * Verifies the account creation. This can be used with, for example, e-mail verification.
   * The account can only be used after it is verified.
   * In case verification is not required, this should be called immediately after the `create` call.
   * @param email - the account email
   */
  verify: (email: string) => Promise<void>;

  /**
   * Changes the password
   * @param email - the user's email
   * @param password - the user's password
   */
  changePassword: (email: string, password: string) => Promise<void>;

  /**
   * Delete the account
   * @param email - the user's email
   */
  deleteAccount: (email: string) => Promise<void>;

  /**
   * Creates a Forgot Password Confirmation Record. This will be to remember that
   * a user has made a request to reset a password. Throws an error if the email doesn't
   * exist
   * @param email - the user's email
   * @returns the record id. This should be included in the reset password link
   */
  generateForgotPasswordRecord: (email: string) => Promise<string>;

  /**
   * Gets the email associated with the forgot password confirmation record or undefined
   * if it's not present
   * @param recordId - the record id retrieved from the link
   * @returns the user's email
   */
  getForgotPasswordRecord: (recordId: string) => Promise<string | undefined>;

  /**
   * Deletes the Forgot Password Confirmation Record
   * @param recordId - the record id of the forgot password confirmation record
   */
  deleteForgotPasswordRecord: (recordId: string) => Promise<void>;
}
