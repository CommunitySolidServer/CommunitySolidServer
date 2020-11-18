import { EventEmitter } from 'events';
import type { Patch } from '../ldp/http/Patch';
import type { Representation } from '../ldp/representation/Representation';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
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

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    const identifier = await this.source.addResource(container, representation, conditions);
    this.emit('changed', identifier);
    return identifier;
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<void> {
    await this.source.deleteResource(identifier, conditions);
    this.emit('changed', identifier);
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    return this.source.getRepresentation(identifier, preferences, conditions);
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions): Promise<void> {
    await this.source.modifyResource(identifier, patch, conditions);
    this.emit('changed', identifier);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<void> {
    await this.source.setRepresentation(identifier, representation, conditions);
    this.emit('changed', identifier);
  }
}
