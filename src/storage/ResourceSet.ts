import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';

/**
 * A set containing resources.
 */
export interface ResourceSet {
  /**
   * Checks whether a resource exists in this ResourceSet.
   *
   * @param identifier - Identifier of resource to check.
   *
   * @returns A promise resolving if the resource already exists.
   */
  hasResource: (identifier: ResourceIdentifier) => Promise<boolean>;
}
