import { Representation } from '../../ldp/representation/Representation';
import { RepresentationPreferences } from '../../ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { ResourceStore } from '../../storage/ResourceStore';

/**
 * A RouterRule represents a rule that decides which instance of a
 * ResourceStore should be used to handle the incoming request.
 */
export interface RouterRule {

  /**
   * Find the appropriate ResourceStore to which the request should be routed based on the incoming parameters.
   * @param identifier - Incoming ResourceIdentifier.
   * @param representation - Optional incoming Representation.
   * @param preferences - Optional incoming RepresentationPreferences.
   */
  getMatchingResourceStore: (
    identifier: ResourceIdentifier,
    representation?: Representation,
    preferences?: RepresentationPreferences,
  ) => ResourceStore | undefined;
}
