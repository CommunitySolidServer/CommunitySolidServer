import { toHttpError } from '../errors/HttpErrorUtil';

/**
 * Makes sure that if the given function rejects with an error,
 * an {@link HttpError} will be used.
 */
export async function ensureHttpError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toHttpError(error);
  }
}
