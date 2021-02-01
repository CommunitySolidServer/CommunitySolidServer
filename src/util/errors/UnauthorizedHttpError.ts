import { HttpError } from './HttpError';

/**
 * An error thrown when an agent is not authorized.
 */
export class UnauthorizedHttpError extends HttpError {
  public constructor(message?: string) {
    super(401, 'UnauthorizedHttpError', message);
  }

  public static isInstance(error: any): error is UnauthorizedHttpError {
    return HttpError.isInstance(error) && error.statusCode === 401;
  }
}
