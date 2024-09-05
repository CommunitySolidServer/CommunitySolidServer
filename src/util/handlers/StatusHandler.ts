import { AsyncHandler } from 'asynchronous-handlers';
import { ensureHttpError } from './HandlerUtil';

/**
 * Wraps around an {@link AsyncHandler} to make sure all errors thrown are an {@link HttpError}.
 * In the case of an {@link AggregateError} containing HttpErrors,
 * the status code will be determined based on what makes most sense for them.
 */
export class StatusHandler<TIn = void, TOut = void> extends AsyncHandler<TIn, TOut> {
  protected readonly handler: AsyncHandler<TIn, TOut>;

  public constructor(handler: AsyncHandler<TIn, TOut>) {
    super();
    this.handler = handler;
  }

  public async canHandle(input: TIn): Promise<void> {
    return ensureHttpError(async(): Promise<void> => this.handler.canHandle(input));
  }

  public async handle(input: TIn): Promise<TOut> {
    return ensureHttpError(async(): Promise<TOut> => this.handler.handle(input));
  }

  public async handleSafe(input: TIn): Promise<TOut> {
    return ensureHttpError(async(): Promise<TOut> => this.handler.handleSafe(input));
  }
}
