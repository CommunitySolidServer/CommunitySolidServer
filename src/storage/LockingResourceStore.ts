import { AtomicResourceStore } from './AtomicResourceStore';
import { Conditions } from './Conditions';
import { Patch } from '../ldp/http/Patch';
import { Representation } from '../ldp/representation/Representation';
import { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { ResourceLocker } from './ResourceLocker';
import { ResourceStore } from './ResourceStore';

/**
 * Store that for every call acquires a lock before executing it on the requested resource,
 * and releases it afterwards.
 */
export class LockingResourceStore implements AtomicResourceStore {
  private readonly source: ResourceStore;
  private readonly locks: ResourceLocker;

  public constructor(source: ResourceStore, locks: ResourceLocker) {
    this.source = source;
    this.locks = locks;
  }

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    return this.lockedRun(container,
      async(): Promise<ResourceIdentifier> => this.source.addResource(container, representation, conditions));
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<void> {
    return this.lockedRun(identifier, async(): Promise<void> => this.source.deleteResource(identifier, conditions));
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    return this.lockedRunGet(identifier, preferences, conditions);
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions): Promise<void> {
    return this.lockedRun(identifier,
      async(): Promise<void> => this.source.modifyResource(identifier, patch, conditions));
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<void> {
    return this.lockedRun(identifier,
      async(): Promise<void> => this.source.setRepresentation(identifier, representation, conditions));
  }

  private async lockedRun<T>(identifier: ResourceIdentifier, func: () => Promise<T>): Promise<T> {
    const lock = await this.locks.acquire(identifier);
    try {
      return await func();
    } finally {
      await lock.release();
    }
  }

  private async lockedRunGet(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    const lock = await this.locks.acquire(identifier);

    // Execute the getRepresentation function and return the resulting Representation.
    let result;
    try {
      result = await this.source.getRepresentation(identifier, preferences, conditions);
      return result;
    } finally {
      // Wait for the end or error event to be called to release the lock if the result contains a valid Readable.
      if (!result || !result.data) {
        await lock.release();
      } else {
        result.data.on('end', async(): Promise<void> => lock.release());
        result.data.on('error', async(): Promise<void> => lock.release());
      }
    }
  }
}
