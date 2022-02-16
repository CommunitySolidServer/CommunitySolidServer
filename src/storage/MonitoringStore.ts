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
    conditions?: Conditions): Promise<RepresentationMetadata[]> {
    const changes = await this.source.addResource(container, representation, conditions);

    this.emitChanged(changes);

    return changes;
  }

  public async deleteResource(identifier: ResourceIdentifier,
    conditions?: Conditions): Promise<RepresentationMetadata[]> {
    const changes = await this.source.deleteResource(identifier, conditions);

    this.emitChanged(changes);

    return changes;
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<RepresentationMetadata[]> {
    const changes = await this.source.setRepresentation(identifier, representation, conditions);

    this.emitChanged(changes);

    return changes;
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch,
    conditions?: Conditions): Promise<RepresentationMetadata[]> {
    const changes = await this.source.modifyResource(identifier, patch, conditions);

    this.emitChanged(changes);

    return changes;
  }

  private emitChanged(changes: RepresentationMetadata[]): RepresentationMetadata[] {
    this.emit('changed', changes);
    return changes;
  }
}
