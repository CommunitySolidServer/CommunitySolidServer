import type { HttpErrorOptions } from './HttpError';
import { HttpError } from './HttpError';

/**
 * The server either does not recognize the request method, or it lacks the ability to fulfil the request.
 * Usually this implies future availability (e.g., a new feature of a web-service API).
 */
export class NotImplementedHttpError extends HttpError {
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(501, 'NotImplementedHttpError', message, options);
  }

  public static isInstance(error: any): error is NotImplementedHttpError {
    return HttpError.isInstance(error) && error.statusCode === 501;
  }
}
