import type { Finalizable } from './final/Finalizable';
import type { Initializer } from './Initializer';

/**
 * Entry point for the entire Solid server.
 */
export class App {
  private readonly initializer: Initializer;
  private readonly finalizer: Finalizable;

  public constructor(initializer: Initializer, finalizer: Finalizable) {
    this.initializer = initializer;
    this.finalizer = finalizer;
  }

  /**
   * Initializes and starts the application.
   */
  public async start(): Promise<void> {
    await this.initializer.handleSafe();
  }

  /**
   * Stops the application and handles cleanup.
   */
  public async stop(): Promise<void> {
    await this.finalizer.finalize();
  }
}
