import { allFulfilled } from '../PromiseUtil';
import type { AsyncHandlerInput, AsyncHandlerOutput } from './AsyncHandler';
import { AsyncHandler } from './AsyncHandler';
import { filterHandlers, findHandler } from './HandlerUtil';

/**
 * Utility handler that allows combining the results of multiple handlers into one.
 * Will run the handlers and then call the abstract `combine` function with the results,
 * which then generates the handler's output.
 */
export abstract class UnionHandler<T extends AsyncHandler<unknown, unknown>> extends
  AsyncHandler<AsyncHandlerInput<T>, AsyncHandlerOutput<T>> {
  protected readonly handlers: T[];
  private readonly requireAll: boolean;
  private readonly ignoreErrors: boolean;

  /**
   * Creates a new `UnionHandler`.
   *
   * When `requireAll` is false or `ignoreErrors` is true,
   * the length of the input to `combine` can vary;
   * otherwise, it is exactly the number of handlers.
   *
   * @param handlers - The handlers whose output is to be combined.
   * @param requireAll - If true, will fail if any of the handlers do not support the input.
                         If false, only the handlers that support the input will be called;
   *                     will fail only if none of the handlers can handle the input.
   * @param ignoreErrors - If true, ignores handlers that fail by omitting their output;
   *                       if false, fails when any handlers fail.
   */
  public constructor(handlers: T[], requireAll = false, ignoreErrors = !requireAll) {
    super();
    this.handlers = handlers;
    this.requireAll = requireAll;
    this.ignoreErrors = ignoreErrors;
  }

  public async canHandle(input: AsyncHandlerInput<T>): Promise<void> {
    if (this.requireAll) {
      await this.allCanHandle(input);
    } else {
      // This will error if no handler supports the input
      await findHandler(this.handlers, input);
    }
  }

  public async handle(input: AsyncHandlerInput<T>): Promise<AsyncHandlerOutput<T>> {
    const handlers = this.requireAll ? this.handlers : (await filterHandlers(this.handlers, input)) as T[];
    const results = handlers.map(async(handler): Promise<AsyncHandlerOutput<T>> =>
      (handler.handle(input)) as Promise<AsyncHandlerOutput<T>>);
    return this.combine(await allFulfilled(results, this.ignoreErrors));
  }

  /**
   * Checks if all handlers can handle the input.
   * If not, throw an error based on the errors of the failed handlers.
   */
  protected async allCanHandle(input: AsyncHandlerInput<T>): Promise<void> {
    await allFulfilled(this.handlers.map(async(handler): Promise<void> => handler.canHandle(input)));
  }

  /**
   * Combines the results of the handlers into a single output.
   */
  protected abstract combine(results: AsyncHandlerOutput<T>[]): Promise<AsyncHandlerOutput<T>>;
}
