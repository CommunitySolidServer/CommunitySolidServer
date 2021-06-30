import type { HttpErrorOptions } from './HttpError';
import { HttpError } from './HttpError';
/**
 * An error thrown when a request conflict with current state of the server.
 */
export class ConflictHttpError extends HttpError {
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(409, 'ConflictHttpError', message, options);
  }

  public static isInstance(error: any): error is ConflictHttpError {
    return HttpError.isInstance(error) && error.statusCode === 409;
  }
}
