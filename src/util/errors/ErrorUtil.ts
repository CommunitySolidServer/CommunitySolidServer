import { types } from 'util';

/**
 * Checks if the input is an {@link Error}.
 */
export function isNativeError(error: any): error is Error {
  return types.isNativeError(error);
}
