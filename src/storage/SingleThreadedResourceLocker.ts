import AsyncLock from 'async-lock';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { Lock } from './Lock';
import type { ResourceLocker } from './ResourceLocker';

/**
 * A resource locker making use of the `async-lock` library.
 */
export class SingleThreadedResourceLocker implements ResourceLocker {
  protected readonly logger = getLoggerFor(this);

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
    this.logger.verbose(`Acquiring a lock for ${identifier.path} ...`);
    return new Promise(async(resolve): Promise<Lock> =>
      this.locks.acquire(identifier.path, (done): void => {
        this.logger.verbose(`Acquired a lock for ${identifier.path}.`);
        resolve({ release: async(): Promise<void> => {
          this.logger.verbose(`Released the lock for ${identifier.path}.`);
          done();
        } });
      }));
  }
}
