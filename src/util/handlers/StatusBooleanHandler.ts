import type { AsyncHandler } from 'asynchronous-handlers';
import { BooleanHandler } from 'asynchronous-handlers';
import { StatusHandler } from './StatusHandler';

/**
 * A {@link StatusHandler} implementing a {@link BooleanHandler}.
 */
export class StatusBooleanHandler<TIn> extends StatusHandler<TIn, boolean> {
  public constructor(handlers: AsyncHandler<TIn, boolean>[]) {
    super(new BooleanHandler(handlers));
  }
}
