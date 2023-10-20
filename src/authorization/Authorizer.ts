import type { Credentials } from '../authentication/Credentials';
import { AsyncHandler } from '../util/handlers/AsyncHandler';
import type { AccessMap, PermissionMap } from './permissions/Permissions';

export interface AuthorizerInput<TCredentials extends Record<string, unknown> = Credentials> {
  /**
   * Credentials of the entity that wants to use the resource.
   */
  credentials: TCredentials;
  /**
   * Requested access modes per resource.
   */
  requestedModes: AccessMap;
  /**
   * Actual permissions available per resource and per credential group.
   */
  availablePermissions: PermissionMap;
}

/**
 * Verifies if the credentials provide access with the given permissions on the resource.
 * An {@link Error} with the necessary explanation will be thrown when permissions are not granted.
 */
export abstract class Authorizer<TCredentials extends Record<string, unknown> = Credentials>
  extends AsyncHandler<AuthorizerInput<TCredentials>> {}
