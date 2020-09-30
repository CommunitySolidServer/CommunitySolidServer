import { HttpError } from './HttpError';
/**
 * A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.
 */
export class InternalServerError extends HttpError {
  public constructor(message?: string) {
    super(500, 'InternalServerError', message);
  }
}
