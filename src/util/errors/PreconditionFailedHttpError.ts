import type { HttpErrorOptions } from './HttpError';
import { HttpError } from './HttpError';

/**
 * An error thrown when access was denied due to the conditions on the request.
 */
export class PreconditionFailedHttpError extends HttpError {
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(412, 'PreconditionFailedHttpError', message, options);
  }

  public static isInstance(error: any): error is PreconditionFailedHttpError {
    return HttpError.isInstance(error) && error.statusCode === 412;
  }
}
