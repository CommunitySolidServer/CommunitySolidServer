/**
 * Different modes that require permission.
 */
export enum AccessMode {
  read = 'read',
  append = 'append',
  write = 'write',
  control = 'control',
}

/**
 * A data interface indicating which permissions are required (based on the context).
 */
export type PermissionSet = Record<AccessMode, boolean>;
