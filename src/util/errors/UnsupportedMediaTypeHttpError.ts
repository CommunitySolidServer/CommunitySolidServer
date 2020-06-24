import { HttpError } from './HttpError';

/**
 * An error thrown when the media type of incoming data is not supported by a parser.
 */
export class UnsupportedMediaTypeHttpError extends HttpError {
  public constructor(message?: string) {
    super(415, 'UnsupportedMediaTypeHttpError', message);
  }
}
