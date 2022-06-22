import { EventEmitter } from 'events';
import type { Patch } from '../http/representation/Patch';
import type { Representation } from '../http/representation/Representation';
import type { RepresentationMetadata } from '../http/representation/RepresentationMetadata';
import type { RepresentationPreferences } from '../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { Conditions } from './Conditions';
import type { ResourceStore } from './ResourceStore';

/**
 * Store that notifies listeners of changes to its source
 * by emitting a `changed` event.
 */
export class MonitoringStore<T extends ResourceStore = ResourceStore>
  extends EventEmitter implements ResourceStore {
  private readonly source: T;

  public constructor(source: T) {
    super();
    this.source = source;
  }

  public async hasResource(identifier: ResourceIdentifier): Promise<boolean> {
    return this.source.hasResource(identifier);
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    return this.source.getRepresentation(identifier, preferences, conditions);
  }

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<Record<string, RepresentationMetadata>> {
    return this.emitChanged(await this.source.addResource(container, representation, conditions));
  }

  public async deleteResource(identifier: ResourceIdentifier,
    conditions?: Conditions): Promise<Record<string, RepresentationMetadata>> {
    return this.emitChanged(await this.source.deleteResource(identifier, conditions));
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<Record<string, RepresentationMetadata>> {
    return this.emitChanged(await this.source.setRepresentation(identifier, representation, conditions));
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch,
    conditions?: Conditions): Promise<Record<string, RepresentationMetadata>> {
    return this.emitChanged(await this.source.modifyResource(identifier, patch, conditions));
  }

  private emitChanged(changes: Record<string, RepresentationMetadata>): Record<string, RepresentationMetadata> {
    this.emit('changed', changes);
    return changes;
  }
}
