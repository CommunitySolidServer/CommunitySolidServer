import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../errors/InternalServerError';
import { AsyncHandler } from './AsyncHandler';

/**
 * A composite handler that tries multiple handlers one by one
 * until it finds a handler that returns true.
 * The handlers will be checked in the order they appear in the input array,
 * allowing for more fine-grained handlers to check before catch-all handlers.
 */
export class BooleanHandler<TIn> extends AsyncHandler<TIn, boolean> {
  protected readonly logger = getLoggerFor(this);

  private readonly handlers: AsyncHandler<TIn, boolean>[];

  /**
   * Creates a new BooleanHandler that stores the given handlers.
   * @param handlers - Handlers over which it will run.
   */
  public constructor(handlers: AsyncHandler<TIn, boolean>[]) {
    super();
    this.handlers = handlers;
  }

  /**
   * Loops over every handler until it finds one that returns true.
   * @param input - The data that needs to be handled.
   *
   * @returns A promise corresponding to the existence of an handler that returns
   * true with the given input data.
   * It rejects if a handler throws an error.
   */
  public async handle(input: TIn): Promise<boolean> {
    for (const handler of this.handlers) {
      try {
        const result = await handler.handleSafe(input);
        if (result) {
          return true;
        }
      } catch (error: unknown) {
        this.logger.warn('A handler failed.');
        throw new InternalServerError('A handler failed', { cause: error });
      }
    }

    return false;
  }
}
