import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../errors/InternalServerError';
import type { AsyncHandler } from './AsyncHandler';
import { findHandler } from './HandlerUtil';

/**
 * A composite handler that tries multiple handlers one by one
 * until it finds a handler that supports the input.
 * The handlers will be checked in the order they appear in the input array,
 * allowing for more fine-grained handlers to check before catch-all handlers.
 */
export class WaterfallHandler<TIn, TOut> implements AsyncHandler<TIn, TOut> {
  protected readonly logger = getLoggerFor(this);

  private readonly handlers: AsyncHandler<TIn, TOut>[];

  /**
   * Creates a new WaterfallHandler that stores the given handlers.
   *
   * @param handlers - Handlers over which it will run.
   */
  public constructor(handlers: AsyncHandler<TIn, TOut>[]) {
    this.handlers = handlers;
  }

  /**
   * Checks whether any of the stored handlers can handle the given input.
   *
   * @param input - The data that would need to be handled.
   *
   * @returns A promise resolving if at least 1 handler supports to input, or rejecting if none do.
   */
  public async canHandle(input: TIn): Promise<void> {
    await findHandler(this.handlers, input);
  }

  /**
   * Finds a handler that supports the given input and then lets it handle the given data.
   *
   * @param input - The data that needs to be handled.
   *
   * @returns A promise corresponding to the handle call of a handler that supports the input.
   * It rejects if no handlers support the given data.
   */
  public async handle(input: TIn): Promise<TOut> {
    let handler: AsyncHandler<TIn, TOut>;

    try {
      handler = await findHandler(this.handlers, input);
    } catch (error: unknown) {
      this.logger.warn('All handlers failed. This might be the consequence of calling handle before canHandle.');
      throw new InternalServerError('All handlers failed', { cause: error });
    }

    return handler.handle(input);
  }

  /**
   * Identical to {@link AsyncHandler.handleSafe} but optimized for composite
   * by only needing 1 canHandle call on members.
   *
   * @param input - The input data.
   *
   * @returns A promise corresponding to the handle call of a handler that supports the input.
   * It rejects if no handlers support the given data.
   */
  public async handleSafe(input: TIn): Promise<TOut> {
    const handler = await findHandler(this.handlers, input);

    return handler.handle(input);
  }
}
