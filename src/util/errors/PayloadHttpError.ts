import type { HttpErrorOptions } from './HttpError';
import { HttpError } from './HttpError';

/**
 * An error thrown when data exceeded the pre configured quota
 */
export class PayloadHttpError extends HttpError {
  /**
   * Default message is 'Storage quota was exceeded.'.
   * @param message - Optional, more specific, message.
   * @param options - Optional error options.
   */
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(413,
      'PayloadHttpError',
      message ?? 'Storage quota was exceeded.',
      options);
  }

  public static isInstance(error: any): error is PayloadHttpError {
    return HttpError.isInstance(error) && error.statusCode === 413;
  }
}
