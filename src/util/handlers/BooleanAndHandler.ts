import assert from 'assert';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../errors/InternalServerError';
import { promiseEvery } from '../PromiseUtil';
import { AsyncHandler } from './AsyncHandler';
import { filterHandlers } from './HandlerUtil';

/**
 * A composite handler that returns true if all of its handlers can handle the input and return true.
 * Handler errors are interpreted as false results.
 */
export class BooleanAndHandler<TIn> extends AsyncHandler<TIn, boolean> {
  protected readonly logger = getLoggerFor(this);

  private readonly handlers: AsyncHandler<TIn, boolean>[];

  /**
   * Creates a new BooleanAndHandler that stores the given handlers.
   * @param handlers - Handlers over which it will run.
   */
  public constructor(handlers: AsyncHandler<TIn, boolean>[]) {
    super();
    this.handlers = handlers;
  }

  public async canHandle(input: TIn): Promise<void> {
    // We use this to generate an error if some handler does not support the input
    assert(
      (await filterHandlers(this.handlers, input)).length === this.handlers.length,
      'Not all handlers support this input.',
    );
  }

  public async handleSafe(input: TIn): Promise<boolean> {
    await this.canHandle(input);
    return promiseEvery(this.handlers.map(async(handler): Promise<boolean> => handler.handle(input)));
  }

  public async handle(input: TIn): Promise<boolean> {
    try {
      assert((await filterHandlers(this.handlers, input)).length === this.handlers.length);
    } catch (error: unknown) {
      this.logger.warn('Some handlers failed. This might be the consequence of calling handle before canHandle.');
      throw new InternalServerError('Some handlers failed', { cause: error });
    }
    return promiseEvery(this.handlers.map(async(handler): Promise<boolean> => handler.handle(input)));
  }
}
