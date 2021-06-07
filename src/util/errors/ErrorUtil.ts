import { types } from 'util';
import { HttpError } from './HttpError';

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

/**
 * Returns the HTTP status code corresponding to the error.
 */
export function getStatusCode(error: Error): number {
  return HttpError.isInstance(error) ? error.statusCode : 500;
}
