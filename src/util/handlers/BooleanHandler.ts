import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../errors/InternalServerError';
import { promiseSome } from '../PromiseUtil';
import { AsyncHandler } from './AsyncHandler';
import { filterHandlers } from './HandlerUtil';

/**
 * A composite handler that returns true if any of its handlers can handle the input and return true.
 * Handler errors are interpreted as false results.
 */
export class BooleanHandler<TIn> extends AsyncHandler<TIn, boolean> {
  protected readonly logger = getLoggerFor(this);

  private readonly handlers: AsyncHandler<TIn, boolean>[];

  /**
   * Creates a new BooleanHandler that stores the given handlers.
   *
   * @param handlers - Handlers over which it will run.
   */
  public constructor(handlers: AsyncHandler<TIn, boolean>[]) {
    super();
    this.handlers = handlers;
  }

  public async canHandle(input: TIn): Promise<void> {
    // We use this to generate an error if no handler supports the input
    await filterHandlers(this.handlers, input);
  }

  public async handleSafe(input: TIn): Promise<boolean> {
    const handlers = await filterHandlers(this.handlers, input);
    return promiseSome(handlers.map(async(handler): Promise<boolean> => handler.handle(input)));
  }

  public async handle(input: TIn): Promise<boolean> {
    let handlers: AsyncHandler<TIn, boolean>[];
    try {
      handlers = await filterHandlers(this.handlers, input);
    } catch (error: unknown) {
      this.logger.warn('All handlers failed. This might be the consequence of calling handle before canHandle.');
      throw new InternalServerError('All handlers failed', { cause: error });
    }
    return promiseSome(handlers.map(async(handler): Promise<boolean> => handler.handle(input)));
  }
}
