/**
 * Responsible for storing the records that are used when a user forgets their password.
 */
export interface ForgotPasswordStore {
  /**
   * Creates a Forgot Password Confirmation Record. This will be to remember that
   * a user has made a request to reset a password. Throws an error if the email doesn't
   * exist.
   *
   * @param id - ID of the email/password login object.
   *
   * @returns The record id. This should be included in the reset password link.
   */
  generate: (id: string) => Promise<string>;

  /**
   * Gets the email associated with the forgot password confirmation record
   * or undefined if it's not present.
   *
   * @param recordId - The record id retrieved from the link.
   *
   * @returns The user's email.
   */
  get: (recordId: string) => Promise<string | undefined>;

  /**
   * Deletes the Forgot Password Confirmation Record.
   *
   * @param recordId - The record id of the forgot password confirmation record.
   */
  delete: (recordId: string) => Promise<boolean>;
}
