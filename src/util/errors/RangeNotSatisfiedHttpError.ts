import type { HttpErrorOptions } from './HttpError';
import { generateHttpErrorClass } from './HttpError';

// eslint-disable-next-line ts/naming-convention
const BaseHttpError = generateHttpErrorClass(416, 'RangeNotSatisfiedHttpError');

/**
 * An error thrown when the requested range is not supported.
 */
export class RangeNotSatisfiedHttpError extends BaseHttpError {
  /**
   * Default message is 'The requested range is not supported.'.
   *
   * @param message - Optional, more specific, message.
   * @param options - Optional error options.
   */
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(message ?? 'The requested range is not supported.', options);
  }
}
