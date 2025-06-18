import type { ClusterManager } from '../../../../src/init/cluster/ClusterManager';
import { WorkerManager } from '../../../../src/init/cluster/WorkerManager';

describe('A WorkerManager', (): void => {
  let clusterManager: jest.Mocked<ClusterManager>;
  let workerManager: WorkerManager;

  beforeEach(async(): Promise<void> => {
    clusterManager = {
      isSingleThreaded: jest.fn(),
      spawnWorkers: jest.fn(),
    } satisfies Partial<ClusterManager> as any;

    workerManager = new WorkerManager(clusterManager);
  });

  it('spawns workers when multithreaded.', async(): Promise<void> => {
    clusterManager.isSingleThreaded.mockReturnValue(false);
    await workerManager.handle();
    expect(clusterManager.spawnWorkers).toHaveBeenCalledTimes(1);
  });

  it('does not spawns workers when singlethreaded.', async(): Promise<void> => {
    clusterManager.isSingleThreaded.mockReturnValue(true);
    await workerManager.handle();
    expect(clusterManager.spawnWorkers).toHaveBeenCalledTimes(0);
  });
});
