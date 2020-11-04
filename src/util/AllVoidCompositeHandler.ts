import { AsyncHandler } from './AsyncHandler';

/**
 * A composite handler that runs all of its handlers independent of their result.
 * The `canHandle` check of this handler will always succeed.
 */
export class AllVoidCompositeHandler<TIn> extends AsyncHandler<TIn> {
  private readonly handlers: AsyncHandler<TIn>[];

  public constructor(handlers: AsyncHandler<TIn>[]) {
    super();
    this.handlers = handlers;
  }

  public async handle(input: TIn): Promise<void> {
    for (const handler of this.handlers) {
      try {
        await handler.handleSafe(input);
      } catch {
        // Ignore errors
      }
    }
  }
}
