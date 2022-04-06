import type { HttpErrorOptions } from './HttpError';
import { RedirectHttpError } from './RedirectHttpError';

/**
 * Error used for resources that have been moved permanently.
 * Method and body should not be changed in subsequent requests.
 */
export class PermanentRedirectHttpError extends RedirectHttpError {
  public constructor(location: string, message?: string, options?: HttpErrorOptions) {
    super(308, location, 'PermanentRedirectHttpError', message, options);
  }

  public static isInstance(error: any): error is PermanentRedirectHttpError {
    return RedirectHttpError.isInstance(error) && error.statusCode === 308;
  }
}
