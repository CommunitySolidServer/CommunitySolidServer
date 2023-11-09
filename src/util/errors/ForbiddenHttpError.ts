import type { HttpErrorOptions } from './HttpError';
import { generateHttpErrorClass } from './HttpError';

// eslint-disable-next-line ts/naming-convention
const BaseHttpError = generateHttpErrorClass(403, 'ForbiddenHttpError');

/**
 * An error thrown when an agent is not allowed to access data.
 */
export class ForbiddenHttpError extends BaseHttpError {
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(message, options);
  }
}
