import type { Permission } from './Permissions';

export enum AclMode {
  control = 'control',
}

// Adds a control field to the permissions to specify this WAC-specific value
export type AclPermission = Permission & {
  [mode in AclMode]?: boolean;
};
