import type { AsyncHandler, AsyncHandlerInput, AsyncHandlerOutput } from 'asynchronous-handlers';
import { ArrayUnionHandler } from 'asynchronous-handlers';
import { StatusHandler } from './StatusHandler';

/**
 * A {@link StatusHandler} implementing an {@link ArrayUnionHandler}.
 */
export class StatusArrayUnionHandler<T extends AsyncHandler<unknown, unknown[]>>
  extends StatusHandler<AsyncHandlerInput<T>, AsyncHandlerOutput<T>> {
  public constructor(handlers: T[], requireAll?: boolean, ignoreErrors?: boolean) {
    super(new ArrayUnionHandler(handlers, requireAll, ignoreErrors));
  }
}
