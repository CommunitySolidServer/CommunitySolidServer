import { AsyncHandler } from './AsyncHandler';

/**
 * A composite handler that executes handlers in parallel.
 */
export class ParallelHandler<TIn = void, TOut = void> extends AsyncHandler<TIn, TOut[]> {
  private readonly handlers: AsyncHandler<TIn, TOut>[];

  public constructor(handlers: AsyncHandler<TIn, TOut>[]) {
    super();
    this.handlers = [ ...handlers ];
  }

  public async canHandle(input: TIn): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    await Promise.all(this.handlers.map((handler): Promise<void> => handler.canHandle(input)));
  }

  public async handle(input: TIn): Promise<TOut[]> {
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    return Promise.all(this.handlers.map((handler): Promise<TOut> => handler.handle(input)));
  }
}
