import type { Worker } from 'node:cluster';
import cluster from 'node:cluster';
import { cpus } from 'node:os';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../../util/errors/InternalServerError';

/**
 * Different cluster modes.
 */
enum ClusterMode {
  /** Scales in relation to `core_count`. */
  autoScale,
  /** Single threaded mode, no clustering */
  singleThreaded,
  /** Fixed amount of workers being forked. (limited to core_count) */
  fixed,
}

/**
 * Convert workers amount to {@link ClusterMode}
 *
 * @param workers - Amount of workers
 *
 * @returns ClusterMode enum value
 */
function toClusterMode(workers: number): ClusterMode {
  if (workers <= 0) {
    return ClusterMode.autoScale;
  }
  if (workers === 1) {
    return ClusterMode.singleThreaded;
  }
  return ClusterMode.fixed;
}

/**
 * This class is responsible for deciding how many affective workers are needed.
 * It also contains the logic for respawning workers when they are killed by the os.
 *
 * The workers values are interpreted as follows:
 * value | actual workers |
 * ------|--------------|
 * `-m` | `num_cores - m` workers _(autoscale)_ (`m < num_cores`) |
 * `-1` | `num_cores - 1` workers _(autoscale)_ |
 * `0` | `num_cores` workers _(autoscale)_ |
 * `1` | `single threaded mode` _(default)_ |
 * `n` | `n` workers |
 */
export class ClusterManager {
  private readonly logger = getLoggerFor(this);
  private readonly workers: number;
  private readonly clusterMode: ClusterMode;

  public constructor(workers: number) {
    const cores = cpus().length;

    if (workers <= -cores) {
      throw new InternalServerError('Invalid workers value (should be in the interval ]-num_cores, +∞).');
    }

    this.workers = toClusterMode(workers) === ClusterMode.autoScale ? cores + workers : workers;
    this.clusterMode = toClusterMode(this.workers);
  }

  /**
   * Spawn all required workers.
   */
  public spawnWorkers(): void {
    let counter = 0;
    this.logger.info(`Setting up ${this.workers} workers`);

    for (let i = 0; i < this.workers; i++) {
      cluster.fork().on('message', (msg: string): void => {
        this.logger.info(msg);
      });
    }

    cluster.on('online', (worker: Worker): void => {
      this.logger.info(`Worker ${worker.process.pid} is listening`);
      counter += 1;
      if (counter === this.workers) {
        this.logger.info(`All ${this.workers} requested workers have been started.`);
      }
    });

    cluster.on('exit', (worker: Worker, code: number, signal: string): void => {
      this.logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
      this.logger.warn('Starting a new worker');
      cluster.fork().on('message', (msg: string): void => {
        this.logger.info(msg);
      });
    });
  }

  /**
   * Check whether the CSS server was booted in single threaded mode.
   *
   * @returns True is single threaded.
   */
  public isSingleThreaded(): boolean {
    return this.clusterMode === ClusterMode.singleThreaded;
  }

  /**
   * Whether the calling process is the primary process.
   *
   * @returns True if primary
   */
  public isPrimary(): boolean {
    return cluster.isMaster;
  }

  /**
   * Whether the calling process is a worker process.
   *
   * @returns True if worker
   */
  public isWorker(): boolean {
    return cluster.isWorker;
  }
}
