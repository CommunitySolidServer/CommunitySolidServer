import type { Patch } from '../ldp/http/Patch';
import type { Representation } from '../ldp/representation/Representation';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { Conditions } from './Conditions';
import type { ResourceStore } from './ResourceStore';
import type { RouterRule } from './routing/RouterRule';

/**
 * Store that routes the incoming request to a specific store based on the stored ResourceRouter.
 * In case no store was found for one of the functions that take no data (GET/PATCH/DELETE),
 * a 404 will be thrown. In the other cases the error of the router will be thrown (which would probably be 400).
 */
export class RoutingResourceStore implements ResourceStore {
  private readonly rule: RouterRule;

  public constructor(rule: RouterRule) {
    this.rule = rule;
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    return (await this.getStore(identifier)).getRepresentation(identifier, preferences, conditions);
  }

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    return (await this.getStore(container, representation)).addResource(container, representation, conditions);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<void> {
    return (await this.getStore(identifier, representation)).setRepresentation(identifier, representation, conditions);
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<void> {
    return (await this.getStore(identifier)).deleteResource(identifier, conditions);
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions):
  Promise<void> {
    return (await this.getStore(identifier)).modifyResource(identifier, patch, conditions);
  }

  private async getStore(identifier: ResourceIdentifier, representation?: Representation): Promise<ResourceStore> {
    if (representation) {
      return this.rule.handleSafe({ identifier, representation });
    }

    // In case there is no incoming data we want to return 404 if no store was found
    try {
      return await this.rule.handleSafe({ identifier });
    } catch (error: unknown) {
      if (NotImplementedHttpError.isInstance(error)) {
        throw new NotFoundHttpError();
      }
      throw error;
    }
  }
}
