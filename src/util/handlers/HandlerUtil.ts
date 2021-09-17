import { BadRequestHttpError } from '../errors/BadRequestHttpError';
import { createErrorMessage, isError } from '../errors/ErrorUtil';
import { HttpError } from '../errors/HttpError';
import { InternalServerError } from '../errors/InternalServerError';
import type { AsyncHandler } from './AsyncHandler';

/**
 * Combines a list of errors into a single HttpErrors.
 * Status code depends on the input errors. If they all share the same status code that code will be re-used.
 * If they are all within the 4xx range, 400 will be used, otherwise 500.
 *
 * @param errors - Errors to combine.
 * @param messagePrefix - Prefix for the aggregate error message. Will be followed with an array of all the messages.
 */
export function createAggregateError(errors: Error[], messagePrefix = 'No handler supports the given input:'):
HttpError {
  const httpErrors = errors.map((error): HttpError =>
    HttpError.isInstance(error) ? error : new InternalServerError(createErrorMessage(error)));
  const joined = httpErrors.map((error: Error): string => error.message).join(', ');
  const message = `${messagePrefix} [${joined}]`;

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

/**
 * Finds a handler that can handle the given input data.
 * Otherwise an error gets thrown.
 *
 * @param handlers - List of handlers to search in.
 * @param input - The input data.
 *
 * @returns A promise resolving to a handler that supports the data or otherwise rejecting.
 */
export async function findHandler<TIn, TOut>(handlers: AsyncHandler<TIn, TOut>[], input: TIn):
Promise<AsyncHandler<TIn, TOut>> {
  const errors: Error[] = [];

  for (const handler of handlers) {
    try {
      await handler.canHandle(input);

      return handler;
    } catch (error: unknown) {
      if (isError(error)) {
        errors.push(error);
      } else {
        errors.push(new Error(createErrorMessage(error)));
      }
    }
  }

  throw createAggregateError(errors);
}

/**
 * Filters a list of handlers to only keep those that can handle the input.
 * Will error if no matching handlers are found.
 *
 * @param handlers - Handlers to filter.
 * @param input - Input that needs to be supported.
 */
export async function filterHandlers<TIn, TOut>(handlers: AsyncHandler<TIn, TOut>[], input: TIn):
Promise<AsyncHandler<TIn, TOut>[]> {
  const results = await Promise.allSettled(handlers.map(async(handler): Promise<AsyncHandler<TIn, TOut>> => {
    await handler.canHandle(input);
    return handler;
  }));
  const matches = results.filter(({ status }): boolean => status === 'fulfilled')
    .map((result): AsyncHandler<TIn, TOut> =>
      (result as PromiseFulfilledResult<AsyncHandler<TIn, TOut>>).value);

  if (matches.length > 0) {
    return matches;
  }

  // Generate error in case no matches were found
  const errors = results.map((result): Error => (result as PromiseRejectedResult).reason);

  throw createAggregateError(errors);
}
