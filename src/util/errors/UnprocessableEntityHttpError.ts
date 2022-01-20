import type { HttpErrorOptions } from './HttpError';
import { HttpError } from './HttpError';

/**
 * An error thrown when the server understands the content-type but can't process the instructions.
 */
export class UnprocessableEntityHttpError extends HttpError {
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(422, 'UnprocessableEntityHttpError', message, options);
  }

  public static isInstance(error: any): error is UnprocessableEntityHttpError {
    return HttpError.isInstance(error) && error.statusCode === 422;
  }
}
