import type { HttpErrorOptions } from './HttpError';
import { generateRedirectHttpErrorClass } from './RedirectHttpError';

// eslint-disable-next-line ts/naming-convention
const BaseHttpError = generateRedirectHttpErrorClass(307, 'TemporaryRedirectHttpError');

/**
 * Error used for resources that have been moved temporarily.
 * Method and body should not be changed in subsequent requests.
 */
export class TemporaryRedirectHttpError extends BaseHttpError {
  public constructor(location: string, message?: string, options?: HttpErrorOptions) {
    super(location, message, options);
  }
}
