import type { HttpErrorOptions } from './HttpError';
import { generateHttpErrorClass } from './HttpError';

// eslint-disable-next-line @typescript-eslint/naming-convention
const BaseHttpError = generateHttpErrorClass(304, 'NotModifiedHttpError');

/**
 * An error thrown when a request conflict with current state of the server.
 */
export class NotModifiedHttpError extends BaseHttpError {
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(message, options);
  }
}