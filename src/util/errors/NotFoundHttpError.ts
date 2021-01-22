import { HttpError } from './HttpError';
/**
 * An error thrown when no data was found for the requested identifier.
 */
export class NotFoundHttpError extends HttpError {
  public constructor(message?: string) {
    super(404, 'NotFoundHttpError', message);
  }

  public static isInstance(error: any): error is NotFoundHttpError {
    return HttpError.isInstance(error) && error.statusCode === 404;
  }
}
