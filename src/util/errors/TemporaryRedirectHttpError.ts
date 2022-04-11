import type { HttpErrorOptions } from './HttpError';
import { RedirectHttpError } from './RedirectHttpError';

/**
 * Error used for resources that have been moved temporarily.
 * Method and body should not be changed in subsequent requests.
 */
export class TemporaryRedirectHttpError extends RedirectHttpError {
  public constructor(location: string, message?: string, options?: HttpErrorOptions) {
    super(307, location, 'TemporaryRedirectHttpError', message, options);
  }

  public static isInstance(error: any): error is TemporaryRedirectHttpError {
    return RedirectHttpError.isInstance(error) && error.statusCode === 307;
  }
}
