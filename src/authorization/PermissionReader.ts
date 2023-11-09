import type { Credentials } from '../authentication/Credentials';
import { AsyncHandler } from '../util/handlers/AsyncHandler';
import type { AccessMap, PermissionMap } from './permissions/Permissions';

export interface PermissionReaderInput {
  /**
   * Credentials of the entity requesting access to resources.
   */
  credentials: Credentials;
  /**
   * For each credential, the reader will check which of the given per-resource access modes are available.
   * However, non-exhaustive information about other access modes and resources can still be returned.
   */
  requestedModes: AccessMap;
}

/**
 * Discovers the permissions of the given credentials on the given identifier.
 * If the reader finds no permission for the requested identifiers and credentials,
 * it can return an empty or incomplete map.
 */
export abstract class PermissionReader extends AsyncHandler<PermissionReaderInput, PermissionMap> {}
