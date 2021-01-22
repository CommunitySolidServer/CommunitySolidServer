import { HttpError } from './HttpError';

/**
 * An error thrown when the media type of incoming data is not supported by a parser.
 */
export class UnsupportedMediaTypeHttpError extends HttpError {
  public constructor(message?: string) {
    super(415, 'UnsupportedMediaTypeHttpError', message);
  }

  public static isInstance(error: any): error is UnsupportedMediaTypeHttpError {
    return HttpError.isInstance(error) && error.statusCode === 415;
  }
}
