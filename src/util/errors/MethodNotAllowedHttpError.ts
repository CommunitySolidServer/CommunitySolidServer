import { HttpError } from './HttpError';
/**
 * An error thrown when data was found for the requested identifier, but is not supported by the target resource.
 */
export class MethodNotAllowedHttpError extends HttpError {
  public constructor(message?: string) {
    super(405, 'MethodNotAllowedHttpError', message);
  }

  public static isInstance(error: any): error is MethodNotAllowedHttpError {
    return HttpError.isInstance(error) && error.statusCode === 405;
  }
}
