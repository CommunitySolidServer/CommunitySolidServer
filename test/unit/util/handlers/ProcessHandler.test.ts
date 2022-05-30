import type { AsyncHandler, ClusterManager } from '../../../../src';
import { NotImplementedHttpError, ProcessHandler } from '../../../../src';

function createClusterManager(workers: number, primary: boolean): jest.Mocked<ClusterManager> {
  return {
    isSingleThreaded: jest.fn().mockReturnValue(workers === 1),
    isWorker: jest.fn().mockReturnValue(!primary),
    isPrimary: jest.fn().mockReturnValue(primary),
  } as any;
}

describe('A ProcessHandler', (): void => {
  const source: jest.Mocked<AsyncHandler<string, string>> = {
    canHandle: jest.fn(),
    handleSafe: jest.fn().mockResolvedValue('handledSafely'),
    handle: jest.fn().mockResolvedValue('handled'),
  };

  describe('allowing only worker processes', (): void => {
    it('can create a ProcessHandler.', (): void => {
      expect((): ProcessHandler<string, string> =>
        new ProcessHandler(source, createClusterManager(1, true), false)).toBeDefined();
    });

    it('can delegate to its source when run singlethreaded from worker.', async(): Promise<void> => {
      const ph = new ProcessHandler(source, createClusterManager(1, false), false);
      await expect(ph.handleSafe('test')).resolves.toBe('handled');
    });

    it('can delegate to its source when run singlethreaded from primary.', async(): Promise<void> => {
      const ph = new ProcessHandler(source, createClusterManager(1, true), false);
      await expect(ph.handleSafe('test')).resolves.toBe('handled');
    });

    it('can delegate to its source when run multithreaded from worker.', async(): Promise<void> => {
      const ph = new ProcessHandler(source, createClusterManager(2, false), false);
      await expect(ph.handleSafe('test')).resolves.toBe('handled');
    });

    it('errors when run multithreaded from primary.', async(): Promise<void> => {
      const ph = new ProcessHandler(source, createClusterManager(2, true), false);
      await expect(ph.handleSafe('test')).rejects.toThrow(NotImplementedHttpError);
    });
  });

  describe('allowing only the primary process', (): void => {
    it('can create a ProcessHandler.', (): void => {
      expect((): ProcessHandler<string, string> =>
        new ProcessHandler(source, createClusterManager(1, true), true)).toBeDefined();
    });

    it('can delegate to its source when run singlethreaded from worker.', async(): Promise<void> => {
      const ph = new ProcessHandler(source, createClusterManager(1, false), true);
      await expect(ph.handleSafe('test')).resolves.toBe('handled');
    });

    it('can delegate to its source when run singlethreaded from primary.', async(): Promise<void> => {
      const ph = new ProcessHandler(source, createClusterManager(1, true), true);
      await expect(ph.handleSafe('test')).resolves.toBe('handled');
    });

    it('can delegate to its source when run multithreaded from primary.', async(): Promise<void> => {
      const ph = new ProcessHandler(source, createClusterManager(2, true), true);
      await expect(ph.handleSafe('test')).resolves.toBe('handled');
    });

    it('errors when run multithreaded from worker.', async(): Promise<void> => {
      const ph = new ProcessHandler(source, createClusterManager(2, false), true);
      await expect(ph.handleSafe('test')).rejects.toThrow(NotImplementedHttpError);
    });
  });
});
