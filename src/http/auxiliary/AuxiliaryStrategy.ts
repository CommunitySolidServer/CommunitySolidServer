import type { Representation } from '../representation/Representation';
import type { RepresentationMetadata } from '../representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';
import type { AuxiliaryIdentifierStrategy } from './AuxiliaryIdentifierStrategy';

/**
 * A strategy for handling one or more types of auxiliary resources.
 * References to "an auxiliary resource" implicitly imply a specific type of auxiliary resources
 * supported by this strategy.
 */
export interface AuxiliaryStrategy extends AuxiliaryIdentifierStrategy {
  /**
   * Whether this auxiliary resources uses its own authorization instead of the subject resource authorization.
   *
   * @param identifier - Identifier of the auxiliary resource.
   */
  usesOwnAuthorization: (identifier: ResourceIdentifier) => boolean;

  /**
   * Whether the root storage container requires this auxiliary resource to be present.
   * If yes, this means they can't be deleted individually from such a container.
   *
   * @param identifier - Identifier of the auxiliary resource.
   */
  isRequiredInRoot: (identifier: ResourceIdentifier) => boolean;

  /**
   * Adds metadata related to this auxiliary resource,
   * in case this is required for this type of auxiliary resource.
   * The metadata that is added depends on the given identifier being an auxiliary or subject resource:
   * the metadata will be used to link to the other one, and potentially add extra typing info.
   *
   * Used for:
   * Solid, §4.3.1: "For any defined auxiliary resource available for a given Solid resource, all representations of
   * that resource MUST include an HTTP Link header pointing to the location of each auxiliary resource."
   * https://solid.github.io/specification/protocol#auxiliary-resources-server
   *
   * The above is an example of how that metadata would only be added in case the input is the subject identifier.
   *
   * @param metadata - Metadata to update.
   */
  addMetadata: (metadata: RepresentationMetadata) => Promise<void>;

  /**
   * Validates if the representation contains valid data for an auxiliary resource.
   * Should throw an error in case the data is invalid.
   *
   * @param identifier - Identifier of the auxiliary resource.
   * @param representation - Representation of the auxiliary resource.
   */
  validate: (representation: Representation) => Promise<void>;
}
