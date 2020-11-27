import { HttpError } from './HttpError';
/**
 * The server either does not recognize the request method, or it lacks the ability to fulfil the request.
 * Usually this implies future availability (e.g., a new feature of a web-service API).
 */
export class NotImplementedHttpError extends HttpError {
  public constructor(message?: string) {
    super(501, 'NotImplementedHttpError', message);
  }
}
