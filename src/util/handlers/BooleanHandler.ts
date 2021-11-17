import type { AsyncHandler } from './AsyncHandler';
import { UnionHandler } from './UnionHandler';

/**
 * A composite handler that returns true if any of its handlers can handle the input and return true.
 * Handler errors are interpreted as false results.
 */
export class BooleanHandler<TIn> extends UnionHandler<AsyncHandler<TIn, boolean>> {
  public constructor(handlers: AsyncHandler<TIn, boolean>[]) {
    super(handlers);
  }

  protected async combine(results: boolean[]): Promise<boolean> {
    return results.includes(true);
  }
}
