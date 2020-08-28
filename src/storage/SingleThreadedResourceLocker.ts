import AsyncLock from 'async-lock';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { Lock } from './Lock';
import { ResourceLocker } from './ResourceLocker';

/**
 * A resource locker making use of the `async-lock` library.
 */
export class SingleThreadedResourceLocker implements ResourceLocker {
  private readonly locks: AsyncLock;

  public constructor() {
    this.locks = new AsyncLock();
  }

  /**
   * Acquires a new lock for the requested identifier.
   * Will resolve when the lock is available.
   * @param identifier - Identifier of resource that needs to be locked.
   *
   * @returns The {@link Lock} when it's available. Its release function needs to be called when finished.
   */
  public async acquire(identifier: ResourceIdentifier): Promise<Lock> {
    return new Promise(async(resolve): Promise<Lock> =>
      this.locks.acquire(identifier.path, (done): void => {
        resolve({ release: async(): Promise<void> => done() });
      }));
  }
}
