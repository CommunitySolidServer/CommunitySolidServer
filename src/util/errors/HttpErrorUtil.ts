import { BadRequestHttpError } from './BadRequestHttpError';
import { createErrorMessage } from './ErrorUtil';
import { HttpError } from './HttpError';
import { InternalServerError } from './InternalServerError';

/**
 * Returns the HTTP status code corresponding to the error.
 */
export function getStatusCode(error: Error): number {
  return HttpError.isInstance(error) ? error.statusCode : 500;
}

/**
 * Combines a list of errors into a single HttpErrors.
 * Status code depends on the input errors. If they all share the same status code that code will be re-used.
 * If they are all within the 4xx range, 400 will be used, otherwise 500.
 *
 * @param errors - Errors to combine.
 */
export function createAggregateError(errors: Error[]):
HttpError {
  const httpErrors = errors.map((error): HttpError =>
    HttpError.isInstance(error) ? error : new InternalServerError(createErrorMessage(error)));
  const messages = httpErrors.map((error: Error): string => error.message).filter((msg): boolean => msg.length > 0);

  // Let message depend on the messages that were present.
  // This prevents a bunch of empty strings being joined in the case most of them were 404s.
  let message: string;
  if (messages.length === 0) {
    message = '';
  } else if (messages.length === 1) {
    message = messages[0];
  } else {
    message = `Multiple handler errors: ${messages.join(', ')}`;
  }

  // Check if all errors have the same status code
  if (httpErrors.length > 0 && httpErrors.every((error): boolean => error.statusCode === httpErrors[0].statusCode)) {
    return new HttpError(httpErrors[0].statusCode, httpErrors[0].name, message);
  }

  // Find the error range (4xx or 5xx)
  if (httpErrors.some((error): boolean => error.statusCode >= 500)) {
    return new InternalServerError(message);
  }
  return new BadRequestHttpError(message);
}
