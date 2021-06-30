import type { HttpErrorOptions } from './HttpError';
import { HttpError } from './HttpError';

/**
 * An error thrown when incoming data is not supported.
 * Probably because an {@link AsyncHandler} returns false on the canHandle call.
 */
export class BadRequestHttpError extends HttpError {
  /**
   * Default message is 'The given input is not supported by the server configuration.'.
   * @param message - Optional, more specific, message.
   * @param options - Optional error options.
   */
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(400,
      'BadRequestHttpError',
      message ?? 'The given input is not supported by the server configuration.',
      options);
  }

  public static isInstance(error: any): error is BadRequestHttpError {
    return HttpError.isInstance(error) && error.statusCode === 400;
  }
}
