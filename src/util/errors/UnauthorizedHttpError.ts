import { HttpError } from './HttpError';

/**
 * An error thrown when an agent is not authorized.
 */
export class UnauthorizedHttpError extends HttpError {
  public constructor(message?: string) {
    super(401, 'UnauthorizedHttpError', message);
  }
}
