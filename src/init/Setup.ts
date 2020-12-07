import type { Initializer } from './Initializer';

export class Setup {
  private readonly initializer: Initializer;

  public constructor(initializer: Initializer) {
    this.initializer = initializer;
  }

  public async setup(): Promise<void> {
    await this.initializer.handleSafe();
  }
}
