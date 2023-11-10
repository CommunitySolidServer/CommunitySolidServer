import { createErrorMessage, isError } from '../errors/ErrorUtil';
import { createAggregateError } from '../errors/HttpErrorUtil';
import type { AsyncHandler } from './AsyncHandler';

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
  const errors = results.map((result): Error => (result as PromiseRejectedResult).reason as Error);

  throw createAggregateError(errors);
}
