import { HttpError } from './HttpError';

export class UnsupportedMediaTypeHttpError extends HttpError {
  public constructor(message?: string) {
    super(415, 'UnsupportedHttpError', message);
  }
}
