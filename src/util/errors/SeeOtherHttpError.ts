import type { HttpErrorOptions } from './HttpError';
import { generateRedirectHttpErrorClass } from './RedirectHttpError';

// eslint-disable-next-line ts/naming-convention
const BaseHttpError = generateRedirectHttpErrorClass(303, 'SeeOtherHttpError');

/**
 * Error used to redirect not to the requested resource itself, but to another page,
 * for example a representation of a real-world object.
 * The method used to display this redirected page is always GET.
 */
export class SeeOtherHttpError extends BaseHttpError {
  public constructor(location: string, message?: string, options?: HttpErrorOptions) {
    super(location, message, options);
  }
}
