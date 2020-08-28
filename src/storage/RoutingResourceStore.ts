import { Patch } from '../ldp/http/Patch';
import { Representation } from '../ldp/representation/Representation';
import { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { ResourceRouter } from '../util/ResourceRouter';
import { Conditions } from './Conditions';
import { ResourceStore } from './ResourceStore';

/**
 * Store that calls a specific store based on certain rules defined by the ResourceRouter.
 */
export class RoutingResourceStore implements ResourceStore {
  private readonly resourceRouter: ResourceRouter;

  public constructor(resourceRouter: ResourceRouter) {
    this.resourceRouter = resourceRouter;
  }

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions: Conditions | undefined): Promise<ResourceIdentifier> {
    return this.resourceRouter.findResourceStore(container, representation)
      .addResource(container, representation, conditions);
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions: Conditions | undefined): Promise<void> {
    return this.resourceRouter.findResourceStore(identifier).deleteResource(identifier, conditions);
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions: Conditions | undefined): Promise<Representation> {
    return this.resourceRouter.findResourceStore(identifier, undefined, preferences)
      .getRepresentation(identifier, preferences, conditions);
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions: Conditions | undefined):
  Promise<void> {
    return this.resourceRouter.findResourceStore(identifier, patch).modifyResource(identifier, patch, conditions);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions: Conditions | undefined): Promise<void> {
    return this.resourceRouter.findResourceStore(identifier, representation)
      .setRepresentation(identifier, representation, conditions);
  }
}
