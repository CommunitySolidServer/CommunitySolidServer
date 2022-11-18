import type { PermissionSet } from './Permissions';

export enum AclMode {
  control = 'control',
}

// Adds a control field to the permissions to specify this WAC-specific value
export type AclPermissionSet = PermissionSet & {
  [mode in AclMode]?: boolean;
};
