/**
 * A storage adapter needed for the email-password interaction
 */
export abstract class EmailPasswordStore {
  /**
   * Authenticate if the username and password are correct and return the webId
   * if it is. Return an error if it is not.
   * @param email - the user's email
   * @param password - this user's password
   * @returns The user's WebId
   */
  abstract authenticate(email: string, password: string): Promise<string>;
  /**
   * Creates a new account
   * @param email - the account email
   * @param webId - account webId
   * @param password - account password
   */
  abstract create(email: string, webId: string, password: string): Promise<void>;
  /**
   * Changes the password
   * @param email - the user's email
   * @param password - the user's password
   */
  abstract changePassword(email: string, password: string): Promise<void>;
  /**
   * Delete the account
   * @param email - the user's email
   */
  abstract deleteAccount(email: string): Promise<void>;
  /**
   * Creates a Forgot Password Confirmation Record. This will be to remember that
   * a user has made a request to reset a password. Throws an error if the email doesn't
   * exist
   * @param email - the user's email
   * @returns the record id. This should be included in the reset password link
   */
  abstract generateForgotPasswordRecord(email: string): Promise<string>;
  /**
   * Gets the email associated with the forgot password confirmation record or undefined
   * if it's not present
   * @param recordId - the record id retrieved from the link
   * @returns the user's email
   */
  abstract getForgotPasswordRecord(recordId: string): Promise<string | undefined>;
  /**
   * Deletes the Forgot Password Confirmation Record
   * @param recordId - the record id of the forgot password confirmation record
   */
  abstract deleteForgotPasswordRecord(recordId: string): Promise<void>;
}
