import type { AsyncHandler, AsyncHandlerOutput } from './AsyncHandler';
import { UnionHandler } from './UnionHandler';

/**
 * A utility handler that concatenates the results of all its handlers into a single result.
 */
export class ArrayUnionHandler<T extends AsyncHandler<unknown, unknown[]>> extends UnionHandler<T> {
  public constructor(handlers: T[], requireAll?: boolean, ignoreErrors?: boolean) {
    super(handlers, requireAll, ignoreErrors);
  }

  protected async combine(results: AsyncHandlerOutput<T>[]): Promise<AsyncHandlerOutput<T>> {
    return results.flat() as AsyncHandlerOutput<T>;
  }
}
