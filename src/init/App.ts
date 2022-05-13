import type { ClusterManager } from './cluster/ClusterManager';
import type { Finalizable } from './final/Finalizable';
import type { Initializer } from './Initializer';

/**
 * Entry point for the entire Solid server.
 */
export class App {
  private readonly initializer: Initializer;
  private readonly finalizer: Finalizable;
  public readonly clusterManager: ClusterManager;

  public constructor(initializer: Initializer, finalizer: Finalizable, clusterManager: ClusterManager) {
    this.initializer = initializer;
    this.finalizer = finalizer;
    this.clusterManager = clusterManager;
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
