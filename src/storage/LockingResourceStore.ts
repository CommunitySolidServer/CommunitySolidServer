import type { Readable } from 'stream';
import type { Patch } from '../ldp/http/Patch';
import type { Representation } from '../ldp/representation/Representation';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { Guarded } from '../util/GuardedStream';
import type { AtomicResourceStore } from './AtomicResourceStore';
import type { Conditions } from './Conditions';
import type { ExpiringLock } from './ExpiringLock';
import type { ExpiringResourceLocker } from './ExpiringResourceLocker';
import type { ResourceStore } from './ResourceStore';

/**
 * Store that for every call acquires a lock before executing it on the requested resource,
 * and releases it afterwards.
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
    return this.lockedRun(container,
      async(): Promise<ResourceIdentifier> => this.source.addResource(container, representation, conditions));
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<void> {
    return this.lockedRun(identifier,
      async(): Promise<void> => this.source.setRepresentation(identifier, representation, conditions));
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<void> {
    return this.lockedRun(identifier, async(): Promise<void> => this.source.deleteResource(identifier, conditions));
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions): Promise<void> {
    return this.lockedRun(identifier,
      async(): Promise<void> => this.source.modifyResource(identifier, patch, conditions));
  }

  /**
   * Acquires a lock for the identifier and releases it when the function is executed.
   * @param identifier - Identifier that should be locked.
   * @param func - Function to be executed.
   */
  protected async lockedRun<T>(identifier: ResourceIdentifier, func: () => Promise<T>): Promise<T> {
    const lock = await this.locks.acquire(identifier);
    try {
      return await func();
    } finally {
      await lock.release();
    }
  }

  /**
   * Acquires a lock for the identifier that should return a representation with Readable data and releases it when the
   * Readable is read, closed or results in an error.
   * When using this function, it is required to close the Readable stream when you are ready.
   *
   * @param identifier - Identifier that should be locked.
   * @param func - Function to be executed.
   */
  protected async lockedRepresentationRun(identifier: ResourceIdentifier, func: () => Promise<Representation>):
  Promise<Representation> {
    const lock = await this.locks.acquire(identifier);
    let representation;
    try {
      // Make the resource time out to ensure that the lock is always released eventually.
      representation = await func();
      return this.createExpiringRepresentation(representation, lock);
    } finally {
      // If the representation contains a valid Readable, wait for it to be consumed.
      const data = representation?.data;
      if (!data) {
        await lock.release();
      } else {
        // When an error occurs, destroy the readable so the lock is released safely.
        data.on('error', (): void => data.destroy());

        // An `end` and/or `close` event signals that the readable has been consumed.
        new Promise((resolve): void => {
          data.on('end', resolve);
          data.on('close', resolve);
        }).then((): any => lock.release(), null);
      }
    }
  }

  /**
   * Wraps a representation to make it time out when nothing is read for a certain amount of time.
   *
   * @param source - The representation to wrap
   * @param lock - The lock for the corresponding identifier.
   */
  protected createExpiringRepresentation(source: Representation, lock: ExpiringLock): Representation {
    return Object.create(source, {
      data: { value: this.createExpiringReadable(source.data, lock) },
    });
  }

  /**
   * Wraps a readable to make it time out when nothing is read for a certain amount of time.
   *
   * @param source - The readable to wrap
   * @param lock - The lock for the corresponding identifier.
   */
  protected createExpiringReadable(source: Guarded<Readable>, lock: ExpiringLock): Readable {
    // Destroy the source when a timeout occurs.
    lock.on('expired', (): void => {
      source.destroy(new Error(`Stream reading timout exceeded`));
    });

    // Spy on the source to renew the lock upon reading.
    return Object.create(source, {
      read: {
        value(size: number): any {
          lock.renew();
          return source.read(size);
        },
      },
    });
  }
}
