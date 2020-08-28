import type { Representation } from '../../ldp/representation/Representation';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../ResourceStore';

/**
 * A RouterRule represents a rule that decides which instance of a
 * ResourceStore should be used to handle the incoming request.
 */
export interface RouterRule {

  /**
   * Find the appropriate ResourceStore to which the request should be routed based on the incoming parameters.
   * @param identifier - Incoming ResourceIdentifier.
   * @param representation - Optional incoming Representation.
   */
  getMatchingResourceStore: (
    identifier: ResourceIdentifier,
    representation?: Representation,
  ) => Promise<ResourceStore>;
}
