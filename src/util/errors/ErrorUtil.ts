import { types } from 'node:util';

/**
 * Checks if the input is an {@link Error}.
 */
export function isError(error: unknown): error is Error {
  return types.isNativeError(error) ||
    (Boolean(error) &&
      typeof (error as Error).name === 'string' &&
      typeof (error as Error).message === 'string' &&
      (typeof (error as Error).stack === 'undefined' || typeof (error as Error).stack === 'string'));
}

/**
 * Creates a string representing the error message of this object.
 */
export function createErrorMessage(error: unknown): string {
  return isError(error) ? error.message : `Unknown error: ${error as string}`;
}
