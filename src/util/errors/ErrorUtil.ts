import { types } from 'util';

/**
 * Checks if the input is an {@link Error}.
 */
export function isError(error: any): error is Error {
  return types.isNativeError(error) ||
    (error &&
    typeof error.name === 'string' &&
    typeof error.message === 'string' &&
    (typeof error.stack === 'undefined' || typeof error.stack === 'string'));
}

/**
 * Creates a string representing the error message of this object.
 */
export function createErrorMessage(error: unknown): string {
  return isError(error) ? error.message : `Unknown error: ${error}`;
}
