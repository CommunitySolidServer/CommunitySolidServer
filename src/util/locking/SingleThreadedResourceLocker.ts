import AsyncLock from 'async-lock';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import type { ResourceLocker } from './ResourceLocker';

/**
 * A resource locker making use of the `async-lock` library.
 * Read and write locks use the same locks so no preference is given to any operations.
 * This should be changed at some point though, see #542.
 */
export class SingleThreadedResourceLocker implements ResourceLocker {
  protected readonly logger = getLoggerFor(this);

  private readonly locks: AsyncLock;

  public constructor() {
    this.locks = new AsyncLock();
  }

  public async withReadLock<T>(identifier: ResourceIdentifier, whileLocked: () => T | Promise<T>): Promise<T> {
    return this.withLock(identifier, whileLocked);
  }

  public async withWriteLock<T>(identifier: ResourceIdentifier, whileLocked: () => T | Promise<T>): Promise<T> {
    return this.withLock(identifier, whileLocked);
  }

  /**
   * Acquires a new lock for the requested identifier.
   * Will resolve when the input function resolves.
   * @param identifier - Identifier of resource that needs to be locked.
   * @param whileLocked - Function to resolve while the resource is locked.
   */
  private async withLock<T>(identifier: ResourceIdentifier, whileLocked: () => T | Promise<T>): Promise<T> {
    this.logger.debug(`Acquiring lock for ${identifier.path}`);

    try {
      return await this.locks.acquire(identifier.path, async(): Promise<T> => {
        this.logger.debug(`Acquired lock for ${identifier.path}`);
        return whileLocked();
      });
    } finally {
      this.logger.debug(`Released lock for ${identifier.path}`);
    }
  }
}
