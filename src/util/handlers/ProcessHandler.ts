import type { ClusterManager } from '../../init/cluster/ClusterManager';
import { NotImplementedHttpError } from '../errors/NotImplementedHttpError';
import { AsyncHandler } from './AsyncHandler';

/**
 * A wrapper handler that will only run the wrapped handler if it is executed from:
 * * when running multithreaded: either the **primary** or a **worker process**
 * * when running singlethreaded: **the only process** (i.e. always)
 */
export class ProcessHandler<TIn, TOut> extends AsyncHandler<TIn, TOut> {
  private readonly clusterManager: ClusterManager;
  private readonly source: AsyncHandler<TIn, TOut>;
  private readonly executeOnPrimary: boolean;

  /**
   * Creates a new ProcessHandler
   *
   * @param source - The wrapped handler
   * @param clusterManager - The ClusterManager in use
   * @param executeOnPrimary - Whether to execute the source handler when the process is the _primary_ or a _worker_.
   */
  public constructor(source: AsyncHandler<TIn, TOut>, clusterManager: ClusterManager, executeOnPrimary: boolean) {
    super();
    this.source = source;
    this.clusterManager = clusterManager;
    this.executeOnPrimary = executeOnPrimary;
  }

  public async canHandle(input: TIn): Promise<void> {
    if (!this.canExecute()) {
      throw new NotImplementedHttpError(`Will not execute on ${this.executeOnPrimary ? 'worker' : 'primary'} process.`);
    }
    await this.source.canHandle(input);
  }

  public async handle(input: TIn): Promise<TOut> {
    return this.source.handle(input);
  }

  /**
   * Checks if the condition has already been fulfilled.
   */
  private canExecute(): boolean {
    return this.clusterManager.isSingleThreaded() ||
      (this.executeOnPrimary ? this.clusterManager.isPrimary() : this.clusterManager.isWorker());
  }
}
