import type { ClusterManager } from '../../../src';
import { App } from '../../../src/init/App';
import type { Finalizer } from '../../../src/init/final/Finalizer';
import type { Initializer } from '../../../src/init/Initializer';

describe('An App', (): void => {
  let initializer: Initializer;
  let finalizer: Finalizer;
  let clusterManager: ClusterManager;
  let app: App;

  beforeEach(async(): Promise<void> => {
    initializer = { handleSafe: jest.fn() } as any;
    finalizer = { handleSafe: jest.fn() } as any;
    clusterManager = {} as any;
    app = new App(initializer, finalizer, clusterManager);
  });

  it('can start with the initializer.', async(): Promise<void> => {
    await expect(app.start()).resolves.toBeUndefined();
    expect(initializer.handleSafe).toHaveBeenCalledTimes(1);
  });

  it('can stop with the finalizer.', async(): Promise<void> => {
    await expect(app.stop()).resolves.toBeUndefined();
    expect(finalizer.handleSafe).toHaveBeenCalledTimes(1);
  });

  it('can check its clusterManager for the threading mode.', async(): Promise<void> => {
    await expect(app.start()).resolves.toBeUndefined();
    expect(app.clusterManager).toBe(clusterManager);
  });
});
