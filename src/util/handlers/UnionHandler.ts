import { AsyncHandler } from './AsyncHandler';
import { createAggregateError, filterHandlers, findHandler } from './HandlerUtil';

// Helper types to make sure the UnionHandler has the same in/out types as the AsyncHandler type it wraps
type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
type InType<T extends AsyncHandler<any, any>> = Parameters<T['handle']>[0];
type OutType<T extends AsyncHandler<any, any>> = ThenArg<ReturnType<T['handle']>>;
type HandlerType<T extends AsyncHandler> = AsyncHandler<InType<T>, OutType<T>>;

/**
 * Utility handler that allows combining the results of multiple handlers into one.
 * Will run all the handlers and then call the abstract `combine` function with the results,
 * which should return the output of the class.
 *
 * If `requireAll` is true, the handler will fail if any of the handlers do not support the input.
 * If `requireAll` is false, only the handlers that support the input will be called,
 * only if all handlers reject the input will this handler reject as well.
 * With `requireAll` set to false, the length of the input array
 * for the `combine` function is variable (but always at least 1).
 */
export abstract class UnionHandler<T extends AsyncHandler<any, any>> extends AsyncHandler<InType<T>, OutType<T>> {
  protected readonly handlers: T[];
  private readonly requireAll: boolean;

  protected constructor(handlers: T[], requireAll = false) {
    super();
    this.handlers = handlers;
    this.requireAll = requireAll;
  }

  public async canHandle(input: InType<T>): Promise<void> {
    if (this.requireAll) {
      await this.allCanHandle(input);
    } else {
      // This will error if no handler supports the input
      await findHandler(this.handlers, input);
    }
  }

  public async handle(input: InType<T>): Promise<OutType<T>> {
    let handlers: HandlerType<T>[];
    if (this.requireAll) {
      // Handlers were already checked in canHandle
      // eslint-disable-next-line prefer-destructuring
      handlers = this.handlers;
    } else {
      handlers = await filterHandlers(this.handlers, input);
    }

    const results = await Promise.all(
      handlers.map(async(handler): Promise<OutType<T>> => handler.handle(input)),
    );

    return this.combine(results);
  }

  public async handleSafe(input: InType<T>): Promise<OutType<T>> {
    let handlers: HandlerType<T>[];
    if (this.requireAll) {
      await this.allCanHandle(input);
      // eslint-disable-next-line prefer-destructuring
      handlers = this.handlers;
    } else {
      // This will error if no handler supports the input
      handlers = await filterHandlers(this.handlers, input);
    }

    const results = await Promise.all(
      handlers.map(async(handler): Promise<OutType<T>> => handler.handle(input)),
    );

    return this.combine(results);
  }

  /**
   * Checks if all handlers can handle the input.
   * If not, throw an error based on the errors of the failed handlers.
   */
  private async allCanHandle(input: InType<T>): Promise<void> {
    const results = await Promise.allSettled(this.handlers.map(async(handler): Promise<HandlerType<T>> => {
      await handler.canHandle(input);
      return handler;
    }));
    if (results.some(({ status }): boolean => status === 'rejected')) {
      const errors = results.map((result): Error => (result as PromiseRejectedResult).reason);
      throw createAggregateError(errors);
    }
  }

  /**
   * Combine the results of the handlers into a single output.
   */
  protected abstract combine(results: OutType<T>[]): Promise<OutType<T>>;
}
