import { HttpError } from './HttpError';
/**
 * An error thrown when a request conflict with current state of the server.
 */
export class ConflictHttpError extends HttpError {
  public constructor(message?: string) {
    super(409, 'ConflictHttpError', message);
  }

  public static isInstance(error: any): error is ConflictHttpError {
    return HttpError.isInstance(error) && error.statusCode === 409;
  }
}
