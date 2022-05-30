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
 * Asserts that the input is a native error.
 * If not the input will be re-thrown.
 */
export function assertError(error: unknown): asserts error is Error {
  if (!isError(error)) {
    throw error;
  }
}

export function createErrorMessage(error: unknown): string {
  return isError(error) ? error.message : `Unknown error: ${error}`;
}
