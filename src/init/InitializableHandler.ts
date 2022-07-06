import type { Initializable } from './Initializable';
import { Initializer } from './Initializer';

/**
 * Allows using an Initializable as an Initializer Handler.
 */
export class InitializableHandler extends Initializer {
  protected readonly initializable: Initializable;

  public constructor(initializable: Initializable) {
    super();
    this.initializable = initializable;
  }

  public async handle(): Promise<void> {
    return this.initializable.initialize();
  }
}
