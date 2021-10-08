import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';

/**
 * Captures the behavior of container identifiers in a certain storage configuration.
 */
export interface IdentifierStrategy {
  /**
   * Verifies if this identifier is supported.
   * This does not check if this identifier actually exists,
   * but checks if the identifier is in scope for this class.
   */
  supportsIdentifier: (identifier: ResourceIdentifier) => boolean;

  /**
   * Generates the identifier of the container this resource would be a member of.
   * This does not check if that identifier actually exists.
   * Will throw an error if the input identifier is a root container or is not supported.
   */
  getParentContainer: (identifier: ResourceIdentifier) => ResourceIdentifier;

  /**
   * Checks if the input corresponds to the identifier of a root container.
   * This does not check if this identifier actually exists.
   */
  isRootContainer: (identifier: ResourceIdentifier) => boolean;
}
