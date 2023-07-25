import type { HttpRequest } from '../../../server/HttpRequest';
import type { HttpError } from '../../../util/errors/HttpError';
import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { ResponseDescription } from '../response/ResponseDescription';

export interface ErrorHandlerArgs {
  error: HttpError;
  request: HttpRequest;
}

/**
 * Converts an error into a {@link ResponseDescription} based on the request preferences.
 */
export abstract class ErrorHandler extends AsyncHandler<ErrorHandlerArgs, ResponseDescription> {}
