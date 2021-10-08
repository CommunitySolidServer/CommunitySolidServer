import type { CredentialGroup } from '../../authentication/Credentials';

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
 * A data interface indicating which permissions are required (based on the context).
 */
export type Permission = Partial<Record<AccessMode, boolean>>;

export type PermissionSet = Partial<Record<CredentialGroup, Permission>>;
