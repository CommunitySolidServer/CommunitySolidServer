import type { ClusterManager } from './cluster/ClusterManager';
import type { Finalizer } from './final/Finalizer';
import type { Initializer } from './Initializer';

/**
 * Entry point for the entire Solid server.
 */
export class App {
  private readonly initializer: Initializer;
  private readonly finalizer: Finalizer;
  public readonly clusterManager: ClusterManager;

  public constructor(initializer: Initializer, finalizer: Finalizer, clusterManager: ClusterManager) {
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
    await this.finalizer.handleSafe();
  }
}
