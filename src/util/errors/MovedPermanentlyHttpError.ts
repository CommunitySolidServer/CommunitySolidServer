import type { HttpErrorOptions } from './HttpError';
import { RedirectHttpError } from './RedirectHttpError';

/**
 * Error used for resources that have been moved permanently.
 */
export class MovedPermanentlyHttpError extends RedirectHttpError {
  public constructor(location: string, message?: string, options?: HttpErrorOptions) {
    super(301, location, 'MovedPermanentlyHttpError', message, options);
  }

  public static isInstance(error: any): error is MovedPermanentlyHttpError {
    return RedirectHttpError.isInstance(error) && error.statusCode === 301;
  }
}
