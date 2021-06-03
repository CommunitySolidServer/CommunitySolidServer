import { types } from 'util';
import { HttpError } from './HttpError';

/**
 * Checks if the input is an {@link Error}.
 */
export function isNativeError(error: any): error is Error {
  return types.isNativeError(error);
}

/**
 * Asserts that the input is a native error.
 * If not the input will be re-thrown.
 */
export function assertNativeError(error: any): asserts error is Error {
  if (!isNativeError(error)) {
    throw error;
  }
}

/**
 * Returns the HTTP status code corresponding to the error.
 */
export function getStatusCode(error: Error): number {
  return HttpError.isInstance(error) ? error.statusCode : 500;
}
