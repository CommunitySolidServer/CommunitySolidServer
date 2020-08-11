import { HttpError } from './HttpError';
/**
 * An error thrown when the server encountered an unexpected condition.
 */
export class InternalServerError extends HttpError {
  public constructor(message?: string) {
    super(500, 'InternalServerError', message);
  }
}
