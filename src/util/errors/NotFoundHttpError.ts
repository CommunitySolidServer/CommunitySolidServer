import { HttpError } from './HttpError';

export class NotFoundHttpError extends HttpError {
  public constructor(message?: string) {
    super(404, 'NotFoundHttpError', message);
  }
}
