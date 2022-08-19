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
 * The keys that can be used in a {@link PermissionSet};
 */
export const permissionSetKeys = [ 'public', 'agent' ] as const;

/**
 * Contains the public permissions and those specific for the agent.
 * There is no good reason to subdivide permissions per type of credentials
 * since credentials are a combination of multiple factors.
 * The only reason is the WAC-Allow header which requires this subdivision,
 * which is why we make that same division here.
 */
export type PermissionSet = Partial<Record<typeof permissionSetKeys[number], Permission>>;

/**
 * PermissionSet per identifier.
 */
export type PermissionMap = IdentifierMap<PermissionSet>;
