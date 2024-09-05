import type { AsyncHandler, AsyncHandlerInput, AsyncHandlerOutput } from 'asynchronous-handlers';
import { UnionHandler } from 'asynchronous-handlers';
import { StatusHandler } from './StatusHandler';

/**
 * A {@link StatusHandler} implementing a {@link UnionHandler}.
 */
export abstract class StatusUnionHandler<T extends AsyncHandler<unknown, unknown>>
  extends StatusHandler<AsyncHandlerInput<T>, AsyncHandlerOutput<T>> {
  public constructor(handlers: T[], requireAll = false, ignoreErrors = !requireAll) {
    // Workaround for the fact that we want the same behaviour as a UnionHandler
    let combine: (results: AsyncHandlerOutput<T>[]) => Promise<AsyncHandlerOutput<T>>;
    const INTERNAL_CLASS = class extends UnionHandler<T> {
      protected async combine(results: AsyncHandlerOutput<T>[]): Promise<AsyncHandlerOutput<T>> {
        return combine(results);
      }
    };
    super(new INTERNAL_CLASS(handlers, requireAll, ignoreErrors));
    combine = this.combine.bind(this);
  }

  protected abstract combine(results: AsyncHandlerOutput<T>[]): Promise<AsyncHandlerOutput<T>>;
}
