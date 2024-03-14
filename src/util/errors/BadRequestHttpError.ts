import type { HttpErrorOptions } from './HttpError';
import { generateHttpErrorClass } from './HttpError';

// eslint-disable-next-line ts/naming-convention
const BaseHttpError = generateHttpErrorClass(400, 'BadRequestHttpError');

/**
 * An error thrown when incoming data is not supported.
 * Probably because an {@link AsyncHandler} returns false on the canHandle call.
 */
export class BadRequestHttpError extends BaseHttpError {
  /**
   * Default message is 'The given input is not supported by the server configuration.'.
   *
   * @param message - Optional, more specific, message.
   * @param options - Optional error options.
   */
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(message ?? 'The given input is not supported by the server configuration.', options);
  }
}
