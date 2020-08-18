import { AsyncHandler } from './AsyncHandler';
import { UnsupportedHttpError } from './errors/UnsupportedHttpError';

/**
 * Handler that combines several other handlers,
 * thereby allowing other classes that depend on a single handler to still use multiple.
 * The handlers will be checked in the order they appear in the input array,
 * allowing for more fine-grained handlers to check before catch-all handlers.
 */
export class CompositeAsyncHandler<TIn, TOut> implements AsyncHandler<TIn, TOut> {
  private readonly handlers: AsyncHandler<TIn, TOut>[];

  /**
   * Creates a new CompositeAsyncHandler that stores the given handlers.
   * @param handlers - Handlers over which it will run.
   */
  public constructor(handlers: AsyncHandler<TIn, TOut>[]) {
    this.handlers = handlers;
  }

  /**
   * Checks if any of the stored handlers can handle the given input.
   * @param input - The data that would need to be handled.
   *
   * @returns A promise resolving if at least 1 handler supports to input, or rejecting if none do.
   */
  public async canHandle(input: TIn): Promise<void> {
    await this.findHandler(input);
  }

  /**
   * Finds a handler that supports the given input and then lets it handle the given data.
   * @param input - The data that needs to be handled.
   *
   * @returns A promise corresponding to the handle call of a handler that supports the input.
   * It rejects if no handlers support the given data.
   */
  public async handle(input: TIn): Promise<TOut> {
    let handler: AsyncHandler<TIn, TOut>;

    try {
      handler = await this.findHandler(input);
    } catch (error) {
      throw new Error('All handlers failed. This might be the consequence of calling handle before canHandle.');
    }

    return handler.handle(input);
  }

  /**
   * Identical to {@link AsyncHandler.handleSafe} but optimized for composite
   * by only needing 1 canHandle call on members.
   * @param input - The input data.
   *
   * @returns A promise corresponding to the handle call of a handler that supports the input.
   * It rejects if no handlers support the given data.
   */
  public async handleSafe(input: TIn): Promise<TOut> {
    const handler = await this.findHandler(input);

    return handler.handle(input);
  }

  /**
   * Finds a handler that can handle the given input data.
   * Otherwise an error gets thrown.
   *
   * @param input - The input data.
   *
   * @returns A promise resolving to a handler that supports the data or otherwise rejecting.
   */
  private async findHandler(input: TIn): Promise<AsyncHandler<TIn, TOut>> {
    const errors: Error[] = [];

    for (const handler of this.handlers) {
      try {
        await handler.canHandle(input);

        return handler;
      } catch (error) {
        errors.push(error);
      }
    }

    const joined = errors.map((error: Error): string => error.message).join(', ');

    throw new UnsupportedHttpError(`No handler supports the given input: [${joined}].`);
  }
}
