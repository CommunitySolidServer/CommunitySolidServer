import type { HttpErrorOptions } from './HttpError';
import { RedirectHttpError } from './RedirectHttpError';

/**
 * Error used to redirect not to the requested resource itself, but to another page,
 * for example a representation of a real-world object.
 * The method used to display this redirected page is always GET.
 */
export class SeeOtherHttpError extends RedirectHttpError {
  public constructor(location: string, message?: string, options?: HttpErrorOptions) {
    super(303, location, 'SeeOtherHttpError', message, options);
  }

  public static isInstance(error: any): error is SeeOtherHttpError {
    return RedirectHttpError.isInstance(error) && error.statusCode === 303;
  }
}
