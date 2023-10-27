import type { HttpErrorOptions } from './HttpError';
import { generateHttpErrorClass } from './HttpError';

// eslint-disable-next-line ts/naming-convention
const BaseHttpError = generateHttpErrorClass(500, 'InternalServerError');

/**
 * A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.
 */
export class InternalServerError extends BaseHttpError {
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(message, options);
  }
}
