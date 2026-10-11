import { getLoggerFor } from '../../logging/LogUtil';
import type { Finalizable } from './Finalizable';
import { Finalizer } from './Finalizer';

/**
 * Allows using a Finalizable as a Finalizer Handler.
 *
 * Configurations can replace the referenced instance with one that is not a Finalizable,
 * in which case there is nothing to finalize and this handler does nothing.
 */
export class FinalizableHandler extends Finalizer {
  protected readonly logger = getLoggerFor(this);

  protected readonly finalizable: Finalizable;

  public constructor(finalizable: Finalizable) {
    super();
    this.finalizable = finalizable;
  }

  public async handle(): Promise<void> {
    if (typeof this.finalizable.finalize !== 'function') {
      this.logger.debug(`Skipping finalization of ${this.finalizable.constructor.name} as it is not a Finalizable.`);
      return;
    }
    return this.finalizable.finalize();
  }
}
