import { getLoggerFor } from '../../logging/LogUtil';
import { BadRequestHttpError } from '../errors/BadRequestHttpError';
import { isNativeError } from '../errors/ErrorUtil';
import { HttpError } from '../errors/HttpError';
import { InternalServerError } from '../errors/InternalServerError';
import type { AsyncHandler } from './AsyncHandler';

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
    } catch {
      this.logger.warn('All handlers failed. This might be the consequence of calling handle before canHandle.');
      throw new Error('All handlers failed');
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
    const errors: HttpError[] = [];

    for (const handler of this.handlers) {
      try {
        await handler.canHandle(input);

        return handler;
      } catch (error: unknown) {
        if (HttpError.isInstance(error)) {
          errors.push(error);
        } else if (isNativeError(error)) {
          errors.push(new InternalServerError(error.message));
        } else {
          errors.push(new InternalServerError('Unknown error'));
        }
      }
    }

    const joined = errors.map((error: Error): string => error.message).join(', ');
    const message = `No handler supports the given input: [${joined}]`;

    // Check if all errors have the same status code
    if (errors.length > 0 && errors.every((error): boolean => error.statusCode === errors[0].statusCode)) {
      throw new HttpError(errors[0].statusCode, errors[0].name, message);
    }

    // Find the error range (4xx or 5xx)
    if (errors.some((error): boolean => error.statusCode >= 500)) {
      throw new InternalServerError(message);
    }
    throw new BadRequestHttpError(message);
  }
}
