import type { Readable } from 'node:stream';
import type { AuxiliaryIdentifierStrategy } from '../http/auxiliary/AuxiliaryIdentifierStrategy';
import type { Patch } from '../http/representation/Patch';
import type { Representation } from '../http/representation/Representation';
import type { RepresentationPreferences } from '../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { guardStream } from '../util/GuardedStream';
import type { ExpiringReadWriteLocker } from '../util/locking/ExpiringReadWriteLocker';
import { endOfStream } from '../util/StreamUtil';
import type { AtomicResourceStore } from './AtomicResourceStore';
import type { Conditions } from './conditions/Conditions';
import type { ChangeMap, ResourceStore } from './ResourceStore';

/**
 * Store that for every call acquires a lock before executing it on the requested resource,
 * and releases it afterwards.
 * In case the request returns a Representation the lock will only be released when the data stream is finished.
 * Similarly, for write operations the lock will be maintained as long as the incoming data stream is being read.
 *
 * For auxiliary resources the lock will be applied to the subject resource.
 * The actual operation is still executed on the auxiliary resource.
 */
export class LockingResourceStore implements AtomicResourceStore {
  protected readonly logger = getLoggerFor(this);

  private readonly source: ResourceStore;
  private readonly locks: ExpiringReadWriteLocker;
  private readonly auxiliaryStrategy: AuxiliaryIdentifierStrategy;

  public constructor(
    source: ResourceStore,
    locks: ExpiringReadWriteLocker,
    auxiliaryStrategy: AuxiliaryIdentifierStrategy,
  ) {
    this.source = source;
    this.locks = locks;
    this.auxiliaryStrategy = auxiliaryStrategy;
  }

  public async hasResource(identifier: ResourceIdentifier): Promise<boolean> {
    return this.locks.withReadLock(
      this.getLockIdentifier(identifier),
      async(): Promise<boolean> => this.source.hasResource(identifier),
    );
  }

  public async getRepresentation(
    identifier: ResourceIdentifier,
    preferences: RepresentationPreferences,
    conditions?: Conditions,
  ): Promise<Representation> {
    return this.lockedRepresentationRun(
      this.getLockIdentifier(identifier),
      async(): Promise<Representation> => this.source.getRepresentation(identifier, preferences, conditions),
    );
  }

  public async addResource(
    container: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    return this.lockedWriteRepresentationRun(
      this.getLockIdentifier(container),
      representation,
      async(expiringRepresentation): Promise<ChangeMap> =>
        this.source.addResource(container, expiringRepresentation, conditions),
    );
  }

  public async setRepresentation(
    identifier: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    return this.lockedWriteRepresentationRun(
      this.getLockIdentifier(identifier),
      representation,
      async(expiringRepresentation): Promise<ChangeMap> =>
        this.source.setRepresentation(identifier, expiringRepresentation, conditions),
    );
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<ChangeMap> {
    return this.locks.withWriteLock(
      this.getLockIdentifier(identifier),
      async(): Promise<ChangeMap> => this.source.deleteResource(identifier, conditions),
    );
  }

  public async modifyResource(
    identifier: ResourceIdentifier,
    patch: Patch,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    return this.lockedWriteRepresentationRun(
      this.getLockIdentifier(identifier),
      patch,
      async(expiringRepresentation): Promise<ChangeMap> =>
        this.source.modifyResource(identifier, expiringRepresentation, conditions),
    );
  }

  /**
   * Acquires the correct identifier to lock this resource.
   * For auxiliary resources this means the subject identifier.
   */
  protected getLockIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return this.auxiliaryStrategy.isAuxiliaryIdentifier(identifier) ?
        this.auxiliaryStrategy.getSubjectIdentifier(identifier) :
      identifier;
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
    // See https://github.com/CommunitySolidServer/CommunitySolidServer/pull/536#discussion_r562467957
    return new Promise((resolve, reject): void => {
      let representation: Representation;
      // Make the resource time out to ensure that the lock is always released eventually.
      this.locks.withReadLock(identifier, async(maintainLock): Promise<void> => {
        representation = await whileLocked();
        resolve(this.createExpiringRepresentation(representation, maintainLock));

        // Release the lock when an error occurs or the data finished streaming
        await this.waitForStreamToEnd(representation.data);
      }).catch((error: unknown): void => {
        // Destroy the source stream in case the lock times out
        representation?.data.destroy(error as Error);

        // Let this function return an error in case something went wrong getting the data
        // or in case the timeout happens before `func` returned
        reject(error as Error);
      });
    });
  }

  /**
   * Acquires a write lock that is held until the operation completes.
   * The input representation is adapted to reset the timer every time data is read.
   *
   * @param identifier - Identifier that should be locked.
   * @param inputRepresentation - Representation to pass to the write operation.
   * @param whileLocked - Function to be executed while the resource is locked.
   */
  protected async lockedWriteRepresentationRun<T extends Representation, TResult>(
    identifier: ResourceIdentifier,
    inputRepresentation: T,
    whileLocked: (representation: T) => Promise<TResult>,
  ): Promise<TResult> {
    let operationActive = false;
    return this.locks.withWriteLock(identifier, async(maintainLock): Promise<TResult> => {
      operationActive = true;
      try {
        const expiringRepresentation = this.createExpiringRepresentation(inputRepresentation, maintainLock);
        return await whileLocked(expiringRepresentation);
      } finally {
        operationActive = false;
      }
    }).catch((error: unknown): never => {
      // Destroy the source stream when an acquired lock expires while the operation is still active.
      // This prevents a source store from continuing a write without the protection of the lock.
      if (operationActive) {
        inputRepresentation.data.destroy(error as Error);
      }
      throw error;
    });
  }

  /**
   * Wraps a representation to make it reset the timeout timer every time data is read.
   *
   * @param representation - The representation to wrap
   * @param maintainLock - Function to call to reset the timer.
   */
  protected createExpiringRepresentation<T extends Representation>(representation: T, maintainLock: () => void): T {
    const source = representation.data;
    // Spy on the source to maintain the lock upon reading.
    const data = Object.create(source, {
      read: {
        value(size: number): unknown {
          maintainLock();
          return source.read(size);
        },
      },
    }) as Readable;

    // Reuse metadata to avoid duplicating potentially large container listings.
    return {
      ...representation,
      data: guardStream(data),
      // BasicRepresentation defines isEmpty on its prototype, so it is not copied by the spread.
      isEmpty: representation.isEmpty,
    };
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
      await endOfStream(source);
    } catch {
      // Destroy the stream in case of errors
      if (!source.destroyed) {
        source.destroy();
      }
    }
  }
}
