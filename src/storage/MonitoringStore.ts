import { EventEmitter } from 'events';
import type { Patch } from '../http/representation/Patch';
import type { Representation } from '../http/representation/Representation';
import type { RepresentationPreferences } from '../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { Conditions } from './Conditions';
import type { ModifiedResource, ResourceStore } from './ResourceStore';
import { changedResource } from './ResourceStore';

/**
 * Store that notifies listeners of changes to its source
 * by emitting a `modified` event.
 */
export class MonitoringStore<T extends ResourceStore = ResourceStore>
  extends EventEmitter implements ResourceStore {
  private readonly source: T;

  public constructor(source: T) {
    super();
    this.source = source;
  }

  public async resourceExists(identifier: ResourceIdentifier, conditions?: Conditions): Promise<boolean> {
    return this.source.resourceExists(identifier, conditions);
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    return this.source.getRepresentation(identifier, preferences, conditions);
  }

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ModifiedResource> {
    const identifier = await this.source.addResource(container, representation, conditions);
    this.emitChanged([ changedResource(container), identifier ]);
    return identifier;
  }

  public async deleteResource(identifier: ResourceIdentifier,
    conditions?: Conditions): Promise<ModifiedResource[]> {
    return this.emitChanged(await this.source.deleteResource(identifier, conditions));
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ModifiedResource[]> {
    return this.emitChanged(await this.source.setRepresentation(identifier, representation, conditions));
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch,
    conditions?: Conditions): Promise<ModifiedResource[]> {
    return this.emitChanged(await this.source.modifyResource(identifier, patch, conditions));
  }

  private emitChanged(modified: ModifiedResource[]): ModifiedResource[] {
    // Don't emit 'changed' event for internal resources
    if (!this.isInternalResource(modified)) {
      this.emit('changed', modified);
    }
    return modified;
  }

  private isInternalResource(result: ModifiedResource[]): boolean {
    return result.filter(
      (modified: ModifiedResource): boolean => modified.resource.path.includes('/.internal'),
    ).length > 0;
  }
}
