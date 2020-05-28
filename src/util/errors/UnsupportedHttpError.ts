import { HttpError } from './HttpError';

/**
 * An error thrown when incoming data is not supported.
 * Probably because an {@link AsyncHandler} returns false on the canHandle call.
 */
export class UnsupportedHttpError extends HttpError {
  /**
   * Default message is 'The given input is not supported by the server configuration.'.
   * @param message - Optional, more specific, message.
   */
  public constructor (message?: string) {
    super(400, 'UnsupportedHttpError', message || 'The given input is not supported by the server configuration.');
  }
}
