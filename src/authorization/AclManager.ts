import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';

/**
 * Handles where acl resources are stored.
 */
export interface AclManager {
  /**
   * Returns the identifier of the acl resource corresponding to the given resource.
   * This does not guarantee that this acl resource exists.
   * In the case the input is already an acl resource that will also be the response.
   * @param id - The ResourceIdentifier of which we need the corresponding acl resource.
   *
   * @returns The ResourceIdentifier of the corresponding acl resource.
   */
  getAclDocument: (id: ResourceIdentifier) => Promise<ResourceIdentifier>;

  /**
   * Checks if the input identifier corresponds to an acl resource.
   * This does not check if that acl resource exists,
   * only if the identifier indicates that there could be an acl resource there.
   * @param id - Identifier to check.
   *
   * @returns true if the input identifier points to an acl resource.
   */
  isAclDocument: (id: ResourceIdentifier) => Promise<boolean>;

  /**
   * Returns the identifier of the resource on which the acl constraints are placed.
   * In general, this is the resource identifier when the input is a normal resource,
   * or the non-acl version if the input is an acl resource.
   * This does not guarantee that this resource exists.
   * @param aclId - Identifier of the acl resource.
   *
   * @returns The ResourceIdentifier of the corresponding resource.
   */
  getAclConstrainedResource: (id: ResourceIdentifier) => Promise<ResourceIdentifier>;
}
