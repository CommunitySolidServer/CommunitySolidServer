import type { Patch } from '../ldp/http/Patch';
import type { Representation } from '../ldp/representation/Representation';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import type { Conditions } from './Conditions';
import type { ResourceStore } from './ResourceStore';
import type { RouterRule } from './routing/RouterRule';

/**
 * Store that calls a specific store based on certain routing defined by the ResourceRouter.
 */
export class RoutingResourceStore implements ResourceStore {
  private readonly rule: RouterRule;

  public constructor(rule: RouterRule) {
    this.rule = rule;
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    return (await this.rule.getMatchingResourceStore(identifier))
      .getRepresentation(identifier, preferences, conditions);
  }

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    return (await this.rule.getMatchingResourceStore(container, representation))
      .addResource(container, representation, conditions);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<void> {
    return (await this.rule.getMatchingResourceStore(identifier, representation))
      .setRepresentation(identifier, representation, conditions);
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<void> {
    return (await this.rule.getMatchingResourceStore(identifier)).deleteResource(identifier, conditions);
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions):
  Promise<void> {
    return (await this.rule.getMatchingResourceStore(identifier)).modifyResource(identifier, patch, conditions);
  }
}
