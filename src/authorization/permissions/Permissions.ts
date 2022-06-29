import type { CredentialGroup } from '../../authentication/Credentials';
import type { IdentifierMap, IdentifierSetMultiMap } from '../../util/map/IdentifierMap';

/**
 * Different modes that require permission.
 */
export enum AccessMode {
  read = 'read',
  append = 'append',
  write = 'write',
  create = 'create',
  delete = 'delete',
}

/**
 * Access modes per identifier.
 */
export type AccessMap = IdentifierSetMultiMap<AccessMode>;

/**
 * A data interface indicating which permissions are required (based on the context).
 */
export type Permission = Partial<Record<AccessMode, boolean>>;

/**
 * Permission per CredentialGroup.
 */
export type PermissionSet = Partial<Record<CredentialGroup, Permission>>;

/**
 * PermissionSet per identifier.
 */
export type PermissionMap = IdentifierMap<PermissionSet>;
