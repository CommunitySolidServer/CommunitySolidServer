import { Conditions } from './Conditions';
import { Patch } from '../ldp/http/Patch';
import { PatchHandler } from './patch/PatchHandler';
import { Representation } from '../ldp/representation/Representation';
import { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { ResourceStore } from './ResourceStore';

/**
 * {@link ResourceStore} using decorator pattern for the `modifyResource` function.
 * If the original store supports the {@link Patch}, behaviour will be identical,
 * otherwise one of the {@link PatchHandler}s supporting the given Patch will be called instead.
 */
export class PatchingStore implements ResourceStore {
  private readonly source: ResourceStore;
  private readonly patcher: PatchHandler;

  public constructor(source: ResourceStore, patcher: PatchHandler) {
    this.source = source;
    this.patcher = patcher;
  }

  public async addResource(container: ResourceIdentifier, representation: Representation, conditions?: Conditions): Promise<ResourceIdentifier> {
    return this.source.addResource(container, representation, conditions);
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<void> {
    return this.source.deleteResource(identifier, conditions);
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences, conditions?: Conditions): Promise<Representation> {
    return this.source.getRepresentation(identifier, preferences, conditions);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation, conditions?: Conditions): Promise<void> {
    return this.source.setRepresentation(identifier, representation, conditions);
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions): Promise<void> {
    try {
      return await this.source.modifyResource(identifier, patch, conditions);
    } catch (error) {
      return this.patcher.handleSafe({ identifier, patch });
    }
  }
}
