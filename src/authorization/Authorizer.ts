import type { CredentialSet } from '../authentication/Credentials';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { AsyncHandler } from '../util/handlers/AsyncHandler';
import type { AccessMode, PermissionSet } from './permissions/Permissions';

export interface AuthorizerInput {
  /**
   * Credentials of the entity that wants to use the resource.
   */
  credentials: CredentialSet;
  /**
   * Identifier of the resource that will be read/modified.
   */
  identifier: ResourceIdentifier;
  /**
   * Modes that are requested on the resource.
   */
  modes: Set<AccessMode>;
  /**
   * Permissions that are available for the request.
   */
  permissionSet: PermissionSet;
}

/**
 * Verifies if the credentials provide access with the given permissions on the resource.
 * An {@link Error} with the necessary explanation will be thrown when permissions are not granted.
 */
export abstract class Authorizer extends AsyncHandler<AuthorizerInput> {}
