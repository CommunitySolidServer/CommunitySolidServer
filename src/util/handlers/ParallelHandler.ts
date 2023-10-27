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
    await Promise.all(this.handlers.map(async(handler): Promise<void> => handler.canHandle(input)));
  }

  public async handle(input: TIn): Promise<TOut[]> {
    return Promise.all(this.handlers.map(async(handler): Promise<TOut> => handler.handle(input)));
  }
}
