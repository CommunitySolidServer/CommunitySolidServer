import { HttpError } from './HttpError';
/**
 * An error thrown when a request conflict with current state of the server.
 */
export class ConflictHttpError extends HttpError {
  public constructor(message?: string) {
    super(409, 'ConflictHttpError', message);
  }
}
