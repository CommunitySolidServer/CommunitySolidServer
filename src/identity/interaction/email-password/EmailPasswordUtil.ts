import assert from 'assert';
import { isNativeError } from '../../../util/errors/ErrorUtil';
import { HttpError } from '../../../util/errors/HttpError';
import { IdpInteractionError } from '../util/IdpInteractionError';

/**
 * Throws an IdpInteractionError with contents depending on the type of input error.
 * Default status code is 500 and default error message is 'Unknown Error'.
 * @param error - Error to create an IdPInteractionError from.
 * @param prefilled - Prefilled data for IdpInteractionError.
 */
export function throwIdpInteractionError(error: unknown, prefilled: Record<string, string> = {}): never {
  if (IdpInteractionError.isInstance(error)) {
    if (Object.keys(prefilled).length > 0) {
      throw new IdpInteractionError(error.statusCode, error.message, { ...error.prefilled, ...prefilled });
    } else {
      throw error;
    }
  } else if (HttpError.isInstance(error)) {
    throw new IdpInteractionError(error.statusCode, error.message, prefilled);
  } else if (isNativeError(error)) {
    throw new IdpInteractionError(500, error.message, prefilled);
  } else {
    throw new IdpInteractionError(500, 'Unknown Error', prefilled);
  }
}

/**
 * Asserts that `password` is a string that matches `confirmPassword`.
 * Will throw an Error otherwise.
 * @param password - Password to assert.
 * @param confirmPassword - Confirmation of password to match.
 */
export function assertPassword(password: any, confirmPassword: any): asserts password is string {
  assert(typeof password === 'string' && password.length > 0, 'Password required');
  assert(
    typeof confirmPassword === 'string' && confirmPassword.length > 0,
    'Password confirmation required',
  );
  assert(
    password === confirmPassword,
    'Password and confirmation do not match',
  );
}
