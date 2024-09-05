import type { AsyncHandler } from 'asynchronous-handlers';
import { WaterfallHandler } from 'asynchronous-handlers';
import { StatusHandler } from './StatusHandler';

/**
 * A {@link StatusHandler} implementing a {@link WaterfallHandler}.
 */
export class StatusWaterfallHandler<TIn, TOut> extends StatusHandler<TIn, TOut> {
  public constructor(handlers: AsyncHandler<TIn, TOut>[]) {
    super(new WaterfallHandler(handlers));
  }
}
