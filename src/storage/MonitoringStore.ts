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

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    const identifier = await this.source.addResource(container, representation, conditions);

    // Both the container contents and the resource itself have changed
    this.emit('changed', container);
    this.emit('changed', identifier);

    return identifier;
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<void> {
    await this.source.deleteResource(identifier, conditions);

    // Both the container contents and the resource itself have changed
    if (!this.identifierStrategy.isRootContainer(identifier)) {
      const container = this.identifierStrategy.getParentContainer(identifier);
      this.emit('changed', container);
    }
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

  public async resourceExists(identifier: ResourceIdentifier): Promise<boolean> {
    return this.source.resourceExists(identifier);
  }
}
