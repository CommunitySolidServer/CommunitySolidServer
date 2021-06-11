import type { Finalizable } from '../../../../src/init/final/Finalizable';
import { ParallelFinalizer } from '../../../../src/init/final/ParallelFinalizer';

describe('A ParallelFinalizer', (): void => {
  let finalizers: Finalizable[];
  let finalizer: ParallelFinalizer;
  let results: number[];

  beforeEach(async(): Promise<void> => {
    results = [];
    finalizers = [
      { finalize: jest.fn((): any => results.push(0)) },
      { finalize: jest.fn((): any => results.push(1)) },
    ];

    finalizer = new ParallelFinalizer(finalizers);
  });

  it('is finished when all finalizers are finished.', async(): Promise<void> => {
    await expect(finalizer.finalize()).resolves.toBeUndefined();
    expect(finalizers[0].finalize).toHaveBeenCalledTimes(1);
    expect(finalizers[1].finalize).toHaveBeenCalledTimes(1);
    expect(results).toEqual([ 0, 1 ]);
  });

  it('works if there are no input finalizers.', async(): Promise<void> => {
    finalizer = new ParallelFinalizer();
    await expect(finalizer.finalize()).resolves.toBeUndefined();
  });
});
