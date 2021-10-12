import type { Patch } from '../http/representation/Patch';
import type { Representation } from '../http/representation/Representation';
import type { RepresentationPreferences } from '../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { Conditions } from './Conditions';
import type { ResourceStore } from './ResourceStore';

/**
 * Store that calls the corresponding functions of the source Store.
 * Can be extended by stores that do not want to override all functions
 * by implementing a decorator pattern.
 */
export class PassthroughStore<T extends ResourceStore = ResourceStore> implements ResourceStore {
  protected readonly source: T;

  public constructor(source: T) {
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
    conditions?: Conditions): Promise<ResourceIdentifier> {
    return this.source.addResource(container, representation, conditions);
  }

  public async deleteResource(identifier: ResourceIdentifier,
    conditions?: Conditions): Promise<ResourceIdentifier[]> {
    return this.source.deleteResource(identifier, conditions);
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch,
    conditions?: Conditions): Promise<ResourceIdentifier[]> {
    return this.source.modifyResource(identifier, patch, conditions);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier[]> {
    return this.source.setRepresentation(identifier, representation, conditions);
  }
}
