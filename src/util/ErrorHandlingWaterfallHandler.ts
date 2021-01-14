import type { AsyncHandler } from './AsyncHandler';
import { WaterfallHandler } from './WaterfallHandler';

export class ErrorHandlingWaterfallHandler<TIn, TOut> extends WaterfallHandler<TIn, TOut> {
  private readonly onErrorHandler: AsyncHandler<{ error: unknown; input: TIn }, TOut>;

  public constructor(
    handlers: AsyncHandler<TIn, TOut>[],
    onErrorHandler: AsyncHandler<{ error: unknown; input: TIn }, TOut>,
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
