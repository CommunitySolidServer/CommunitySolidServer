import { Initializer } from '../Initializer';
import type { ClusterManager } from './ClusterManager';

/**
 * Spawns the necessary workers when starting in multithreaded mode.
 */
export class WorkerManager extends Initializer {
  private readonly clusterManager: ClusterManager;

  public constructor(clusterManager: ClusterManager) {
    super();
    this.clusterManager = clusterManager;
  }

  public async handle(): Promise<void> {
    if (!this.clusterManager.isSingleThreaded()) {
      this.clusterManager.spawnWorkers();
    }
  }
}
