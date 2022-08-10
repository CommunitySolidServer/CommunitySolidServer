import type { Finalizable } from './Finalizable';
import { Finalizer } from './Finalizer';

/**
 * Allows using a Finalizable as a Finalizer Handler.
 */
export class FinalizableHandler extends Finalizer {
  protected readonly finalizable: Finalizable;

  public constructor(finalizable: Finalizable) {
    super();
    this.finalizable = finalizable;
  }

  public async handle(): Promise<void> {
    return this.finalizable.finalize();
  }
}
