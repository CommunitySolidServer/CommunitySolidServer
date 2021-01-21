import type { Readable } from 'stream';
import type { Patch } from '../ldp/http/Patch';
import { BasicRepresentation } from '../ldp/representation/BasicRepresentation';
import type { Representation } from '../ldp/representation/Representation';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ExpiringResourceLocker } from '../util/locking/ExpiringResourceLocker';
import type { AtomicResourceStore } from './AtomicResourceStore';
import type { Conditions } from './Conditions';
import type { ResourceStore } from './ResourceStore';

/**
 * Store that for every call acquires a lock before executing it on the requested resource,
 * and releases it afterwards.
 * In case the request returns a Representation the lock will only be released when the data stream is finished.
 */
export class LockingResourceStore implements AtomicResourceStore {
  protected readonly logger = getLoggerFor(this);

  private readonly source: ResourceStore;
  private readonly locks: ExpiringResourceLocker;

  public constructor(source: ResourceStore, locks: ExpiringResourceLocker) {
    this.source = source;
    this.locks = locks;
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    return this.lockedRepresentationRun(identifier,
      async(): Promise<Representation> => this.source.getRepresentation(identifier, preferences, conditions));
  }

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    return this.locks.withWriteLock(container,
      async(): Promise<ResourceIdentifier> => this.source.addResource(container, representation, conditions));
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<void> {
    return this.locks.withWriteLock(identifier,
      async(): Promise<void> => this.source.setRepresentation(identifier, representation, conditions));
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<void> {
    return this.locks.withWriteLock(identifier,
      async(): Promise<void> => this.source.deleteResource(identifier, conditions));
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions): Promise<void> {
    return this.locks.withWriteLock(identifier,
      async(): Promise<void> => this.source.modifyResource(identifier, patch, conditions));
  }

  /**
   * Acquires a lock that is only released when all data of the resulting representation data has been read,
   * an error occurs, or the timeout has been triggered.
   * The resulting data stream will be adapted to reset the timer every time data is read.
   *
   * In case the data of the resulting stream is not needed it should be closed to prevent a timeout error.
   *
   * @param identifier - Identifier that should be locked.
   * @param whileLocked - Function to be executed while the resource is locked.
   */
  protected async lockedRepresentationRun(identifier: ResourceIdentifier, whileLocked: () => Promise<Representation>):
  Promise<Representation> {
    // Create a new Promise that resolves to the resulting Representation
    // while only unlocking when the data has been read (or there's a timeout).
    // Note that we can't just return the result of `withReadLock` since that promise only
    // resolves when the stream is finished, while we want `lockedRepresentationRun` to resolve
    // once we have the Representation.
    // See https://github.com/solid/community-server/pull/536#discussion_r562467957
    return new Promise((resolve, reject): void => {
      let representation: Representation;
      // Make the resource time out to ensure that the lock is always released eventually.
      this.locks.withReadLock(identifier, async(maintainLock): Promise<void> => {
        representation = await whileLocked();
        resolve(this.createExpiringRepresentation(representation, maintainLock));

        // Release the lock when an error occurs or the data finished streaming
        await this.waitForStreamToEnd(representation.data);
      }).catch((error): void => {
        // Destroy the source stream in case the lock times out
        representation?.data.destroy(error);

        // Let this function return an error in case something went wrong getting the data
        // or in case the timeout happens before `func` returned
        reject(error);
      });
    });
  }

  /**
   * Wraps a representation to make it reset the timeout timer every time data is read.
   *
   * @param representation - The representation to wrap
   * @param maintainLock - Function to call to reset the timer.
   */
  protected createExpiringRepresentation(representation: Representation, maintainLock: () => void): Representation {
    const source = representation.data;
    // Spy on the source to maintain the lock upon reading.
    const data = Object.create(source, {
      read: {
        value(size: number): any {
          maintainLock();
          return source.read(size);
        },
      },
    });
    return new BasicRepresentation(data, representation.metadata, representation.binary);
  }

  /**
   * Returns a promise that resolve when the source stream is finished,
   * either by ending or emitting an error.
   * In the case of an error the stream will be destroyed if it hasn't been already.
   *
   * @param source - The input stream.
   */
  protected async waitForStreamToEnd(source: Readable): Promise<void> {
    try {
      await new Promise((resolve, reject): void => {
        source.on('error', reject);
        source.on('end', resolve);
        source.on('close', resolve);
      });
    } catch {
      // Destroy the stream in case of errors
      if (!source.destroyed) {
        source.destroy();
      }
    }
  }
}
