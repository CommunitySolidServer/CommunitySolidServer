import type { HttpErrorOptions } from './HttpError';
import { generateHttpErrorClass } from './HttpError';

// eslint-disable-next-line ts/naming-convention
const BaseHttpError = generateHttpErrorClass(413, 'PayloadHttpError');

/**
 * An error thrown when data exceeded the preconfigured quota
 */
export class PayloadHttpError extends BaseHttpError {
  /**
   * Default message is 'Storage quota was exceeded.'.
   *
   * @param message - Optional, more specific, message.
   * @param options - Optional error options.
   */
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(message ?? 'Storage quota was exceeded.', options);
  }
}
