import type { Finalizable } from './Finalizable';

/**
 * Finalizes all the injected Finalizable classes in parallel.
 */
export class ParallelFinalizer implements Finalizable {
  private readonly finalizers: Finalizable[];

  public constructor(finalizers: Finalizable[] = []) {
    this.finalizers = finalizers;
  }

  public async finalize(): Promise<void> {
    await Promise.all(this.finalizers.map(async(finalizer): Promise<void> => finalizer.finalize()));
  }
}
