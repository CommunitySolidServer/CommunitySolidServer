import { AsyncHandler } from './AsyncHandler';
import { WaterfallHandler } from './WaterfallHandler';

export abstract class OnErrorHandler<TIn, TOut> extends AsyncHandler<{ error: unknown; input: TIn }, TOut> {}

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
