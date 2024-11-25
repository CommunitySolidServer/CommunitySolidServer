import { AsyncHandler } from 'asynchronous-handlers';
import type { Credentials } from '../authentication/Credentials';
import type { AccessMap, MultiPermissionMap } from './permissions/Permissions';

export interface AuthorizerInput {
  /**
   * Credentials of the entity that wants to use the resource.
   */
  credentials: Credentials;
  /**
   * Requested access modes per resource.
   */
  requestedModes: AccessMap;
  /**
   * Actual permissions available per resource and per credential group.
   */
  availablePermissions: MultiPermissionMap;
}

/**
 * Verifies whether the credentials provide access with the given permissions on the resource.
 * An {@link Error} with the necessary explanation will be thrown if permissions are not granted.
 */
export abstract class Authorizer extends AsyncHandler<AuthorizerInput> {}
