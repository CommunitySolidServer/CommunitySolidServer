import type { HttpErrorOptions } from './HttpError';
import { generateHttpErrorClass } from './HttpError';

// eslint-disable-next-line ts/naming-convention
const BaseHttpError = generateHttpErrorClass(412, 'PreconditionFailedHttpError');

/**
 * An error thrown when access was denied due to the conditions on the request.
 */
export class PreconditionFailedHttpError extends BaseHttpError {
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(message, options);
  }
}
