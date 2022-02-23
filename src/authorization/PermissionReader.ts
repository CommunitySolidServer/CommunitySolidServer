import type { CredentialSet } from '../authentication/Credentials';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { AsyncHandler } from '../util/handlers/AsyncHandler';
import type { AccessMode, PermissionSet } from './permissions/Permissions';

export interface PermissionReaderInput {
  /**
   * Credentials of the entity that wants to use the resource.
   */
  credentials: CredentialSet;
  /**
   * Identifier of the resource that will be read/modified.
   */
  identifier: ResourceIdentifier;
  /**
   * This is the minimum set of access modes the output needs to contain,
   * allowing the handler to limit its search space to this set.
   * However, non-exhaustive information about other access modes can still be returned.
   */
  modes: Set<AccessMode>;
}

/**
 * Discovers the permissions of the given credentials on the given identifier.
 */
export abstract class PermissionReader extends AsyncHandler<PermissionReaderInput, PermissionSet> {}
