import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';

/**
 * Handles where acl files are stored.
 */
export interface AclManager {
  /**
   * Returns the identifier of the acl file corresponding to the given resource.
   * This does not guarantee that this acl file exists.
   * In the case the input is already an acl file that will also be the response.
   * @param id - The ResourceIdentifier of which we need the corresponding acl file.
   *
   * @returns The ResourceIdentifier of the corresponding acl file.
   */
  getAcl: (id: ResourceIdentifier) => Promise<ResourceIdentifier>;

  /**
   * Checks if the input identifier corresponds to an acl file.
   * This does not check if that acl file exists,
   * only if the identifier indicates that there could be an acl file there.
   * @param id - Identifier to check.
   *
   * @returns true if the input identifier points to an acl file.
   */
  isAcl: (id: ResourceIdentifier) => Promise<boolean>;
}
