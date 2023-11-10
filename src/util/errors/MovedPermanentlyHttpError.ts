import type { HttpErrorOptions } from './HttpError';
import { generateRedirectHttpErrorClass } from './RedirectHttpError';

// eslint-disable-next-line ts/naming-convention
const BaseHttpError = generateRedirectHttpErrorClass(301, 'MovedPermanentlyHttpError');

/**
 * Error used for resources that have been moved permanently.
 * Methods other than GET may or may not be changed to GET in subsequent requests.
 */
export class MovedPermanentlyHttpError extends BaseHttpError {
  public constructor(location: string, message?: string, options?: HttpErrorOptions) {
    super(location, message, options);
  }
}
