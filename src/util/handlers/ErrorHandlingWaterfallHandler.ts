import type { AsyncHandler } from './AsyncHandler';
import type { OnErrorHandler } from './OnErrorHandler';
import { WaterfallHandler } from './WaterfallHandler';

/**
 * A special kind of waterfall handler that will defer to an "onErrorHandler" if one
 * of the handlers errors during the 'handle' function instead of just deferring to
 * the next error handler.
 */
export class ErrorHandlingWaterfallHandler<TIn, TOut> extends WaterfallHandler<TIn, TOut> {
  private readonly onErrorHandler: OnErrorHandler<TIn, TOut>;

  public constructor(
    handlers: AsyncHandler<TIn, TOut>[],
    onErrorHandler: OnErrorHandler<TIn, TOut>,
  ) {
    super(handlers);
    this.onErrorHandler = onErrorHandler;
  }

  public async handle(input: TIn): Promise<TOut> {
    try {
      return await super.handle(input);
    } catch (error: unknown) {
      return await this.onErrorHandler.handleSafe({ error, input });
    }
  }
}
