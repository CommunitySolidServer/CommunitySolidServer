import type { HttpErrorOptions } from './HttpError';
import { generateRedirectHttpErrorClass } from './RedirectHttpError';

// eslint-disable-next-line ts/naming-convention
const BaseHttpError = generateRedirectHttpErrorClass(302, 'FoundHttpError');

/**
 * Error used for resources that have been moved temporarily.
 * Methods other than GET may or may not be changed to GET in subsequent requests.
 */
export class FoundHttpError extends BaseHttpError {
  public constructor(location: string, message?: string, options?: HttpErrorOptions) {
    super(location, message, options);
  }
}
