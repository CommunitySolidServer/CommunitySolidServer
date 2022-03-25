import type { HttpErrorOptions } from './HttpError';
import { generateRedirectHttpErrorClass } from './RedirectHttpError';

// eslint-disable-next-line @typescript-eslint/naming-convention
const BaseHttpError = generateRedirectHttpErrorClass(301, 'MovedPermanentlyHttpError');

/**
 * Error used for resources that have been moved permanently.
 */
export class MovedPermanentlyHttpError extends BaseHttpError {
  public constructor(location: string, message?: string, options?: HttpErrorOptions) {
    super(location, message, options);
  }
}
