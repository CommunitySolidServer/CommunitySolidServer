import type { HttpErrorOptions } from './HttpError';
import { RedirectHttpError } from './RedirectHttpError';

/**
 * Error used for resources that have been moved temporarily.
 * Methods other than GET may or may not be changed to GET in subsequent requests.
 */
export class FoundHttpError extends RedirectHttpError {
  public constructor(location: string, message?: string, options?: HttpErrorOptions) {
    super(302, location, 'FoundHttpError', message, options);
  }

  public static isInstance(error: any): error is FoundHttpError {
    return RedirectHttpError.isInstance(error) && error.statusCode === 302;
  }
}
