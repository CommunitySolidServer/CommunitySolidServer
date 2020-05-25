import { Credentials } from '../authentication/Credentials';
import { PermissionSet } from '../ldp/permissions/PermissionSet';
import { ResourceIdentifier } from '../ldp/http/ResourceIdentifier';

/**
 * Responsible for the permission verification.
 */
export interface Authorizer {
  /**
   * Verifies if the given credentials have access to the given permissions on the given resource.
   * @param credentials - Credentials of the entity that wants to use the resource.
   * @param identifier - Identifier of the resource that will be read/modified.
   * @param permissions - Permissions that are requested on the resource.
   *
   * @returns A promise resolving when the Authorizer is finished.
   * An {@link Error} with the necessary explanation will be thrown when permissions are not granted.
   */
  ensurePermissions: (
    credentials: Credentials,
    identifier: ResourceIdentifier,
    permissions: PermissionSet,
  ) => Promise<void>;
}
