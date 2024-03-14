import type { ResourceIdentifier } from '../representation/ResourceIdentifier';

/**
 * A strategy for handling auxiliary related ResourceIdentifiers.
 */
export interface AuxiliaryIdentifierStrategy {
  /**
   * Returns the identifier of the auxiliary resource corresponding to the given resource.
   * This does not guarantee that this auxiliary resource exists.
   *
   * Should error if there are multiple results: see {@link getAuxiliaryIdentifiers}.
   *
   * @param identifier - The ResourceIdentifier of which we need the corresponding auxiliary resource.
   *
   * @returns The ResourceIdentifier of the corresponding auxiliary resource.
   */
  getAuxiliaryIdentifier: (identifier: ResourceIdentifier) => ResourceIdentifier;

  /**
   * Returns all the identifiers of corresponding auxiliary resources.
   * This can be used when there are potentially multiple results.
   * In the case of a single result this should be an array containing the result of {@link getAuxiliaryIdentifier}.
   *
   * @param identifier - The ResourceIdentifier of which we need the corresponding auxiliary resources.
   *
   * @returns The ResourceIdentifiers of the corresponding auxiliary resources.
   */
  getAuxiliaryIdentifiers: (identifier: ResourceIdentifier) => ResourceIdentifier[];

  /**
   * Checks if the input identifier corresponds to an auxiliary resource.
   * This does not check if that auxiliary resource exists,
   * only if the identifier indicates that there could be an auxiliary resource there.
   *
   * @param identifier - Identifier to check.
   *
   * @returns true if the input identifier points to an auxiliary resource.
   */
  isAuxiliaryIdentifier: (identifier: ResourceIdentifier) => boolean;

  /**
   * Returns the identifier of the resource which this auxiliary resource is referring to.
   * This does not guarantee that this resource exists.
   *
   * @param identifier - Identifier of the auxiliary resource.
   *
   * @returns The ResourceIdentifier of the subject resource.
   */
  getSubjectIdentifier: (identifier: ResourceIdentifier) => ResourceIdentifier;
}
