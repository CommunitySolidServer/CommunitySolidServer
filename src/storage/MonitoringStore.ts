import { EventEmitter } from 'events';
import type { Patch } from '../ldp/http/Patch';
import type { Representation } from '../ldp/representation/Representation';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
import type { Conditions } from './Conditions';
import type { ResourceStore } from './ResourceStore';

/**
 * Store that notifies listeners of changes to its source
 * by emitting a `changed` event.
 */
export class MonitoringStore<T extends ResourceStore = ResourceStore>
  extends EventEmitter implements ResourceStore {
  private readonly source: T;
  private readonly identifierStrategy: IdentifierStrategy;

  public constructor(source: T, identifierStrategy: IdentifierStrategy) {
    super();
    this.source = source;
    this.identifierStrategy = identifierStrategy;
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    return this.source.getRepresentation(identifier, preferences, conditions);
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions): Promise<void> {
    await this.source.modifyResource(identifier, patch, conditions);
    this.emitChanged(identifier, null);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<void> {
    await this.source.setRepresentation(identifier, representation, conditions);
    this.emitChanged(identifier);
  }

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    const identifier = await this.source.addResource(container, representation, conditions);
    this.emitChanged(identifier, container);
    return identifier;
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<void> {
    await this.source.deleteResource(identifier, conditions);
    this.emitChanged(identifier);
  }

  private emitChanged(resource: ResourceIdentifier, container?: ResourceIdentifier | null): void {
    // Determine the container if none was passed
    if (typeof container === 'undefined' && !this.identifierStrategy.isRootContainer(resource)) {
      container = this.identifierStrategy.getParentContainer(resource);
    }

    // Signal a change on the container if requested
    if (container) {
      this.emit('changed', container);
    }

    // Signal a change on the resource
    this.emit('changed', resource);
  }
}
