import assert from 'assert';

/**
 * Asserts that `password` is a string that matches `confirmPassword`.
 * Will throw an Error otherwise.
 * @param password - Password to assert.
 * @param confirmPassword - Confirmation of password to match.
 */
export function assertPassword(password: any, confirmPassword: any): asserts password is string {
  assert(
    typeof password === 'string' && password.length > 0,
    'Please enter a password.',
  );
  assert(
    typeof confirmPassword === 'string' && confirmPassword.length > 0,
    'Please confirm your password.',
  );
  assert(
    password === confirmPassword,
    'Your password and confirmation did not match.',
  );
}
