import { watch } from 'fs';
import { lock } from 'proper-lockfile';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import type { FileIdentifierMapper } from '../../storage/FileIdentifierMapper';
import { InternalServerError } from '../errors/InternalServerError';
import type { Lock } from './Lock';
import type { ResourceLocker } from './ResourceLocker';

/**
 * A resource locker making use of the `proper-lockfile` library.
 */
export class LockfileResourceLocker implements ResourceLocker {
  protected readonly logger = getLoggerFor(this);

  private readonly resourceMapper: FileIdentifierMapper;
  private readonly contentType: string = 'internal/lock';

  /**
   * @param resourceMapper - FileIdentifierMapper to map the identifier to its lockfile.
   */
  public constructor(resourceMapper: FileIdentifierMapper) {
    this.resourceMapper = resourceMapper;
  }

  /**
   * Acquires a new lock for the requested identifier.
   * Will resolve when the lock is available.
   * @param identifier - Identifier of resource that needs to be locked.
   *
   * @returns The {@link Lock} when it's available. Its release function needs to be called when finished.
   */
  public async acquire(identifier: ResourceIdentifier): Promise<Lock> {
    this.logger.verbose(`Acquiring lock for ${identifier.path}`);
    const resourceLink = await this.resourceMapper.mapUrlToFilePath(identifier, this.contentType);
    return new Promise(async(resolve, reject): Promise<void> => {
      let acquiredLock = false;
      lock(resourceLink.filePath, { realpath: false }).then((release): void => {
        this.logger.verbose(`Acquired lock for ${identifier.path}`);
        acquiredLock = true;
        resolve({ release: async(): Promise<void> => {
          this.logger.verbose(`Released lock for ${identifier.path}`);
          return release();
        } });
      }).catch((error): void => {
        if (acquiredLock) {
          // A lock had already been acquired, so this is not an error in acquiring a lock, but in releasing it.
          this.logger.error(`Releasing lock for ${identifier.path} failed with \n${error}`);
          reject(new InternalServerError(`Releasing lock for ${identifier.path} failed`));
        } else {
          // Wait for the lockfile to change and then try again with a recursive call.
          const watcher = watch(`${resourceLink.filePath}.lock`);
          watcher.on('change', (): any => this.acquire(identifier));
        }
      });
    });
  }
}
