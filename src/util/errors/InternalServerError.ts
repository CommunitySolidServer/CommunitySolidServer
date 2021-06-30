import type { HttpErrorOptions } from './HttpError';
import { HttpError } from './HttpError';
/**
 * A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.
 */
export class InternalServerError extends HttpError {
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(500, 'InternalServerError', message, options);
  }

  public static isInstance(error: any): error is InternalServerError {
    return HttpError.isInstance(error) && error.statusCode === 500;
  }
}
