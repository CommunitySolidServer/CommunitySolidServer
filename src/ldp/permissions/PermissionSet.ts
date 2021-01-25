/**
 * A data interface indicating which permissions are required (based on the context).
 */
export interface PermissionSet {
  read: boolean;
  append: boolean;
  write: boolean;
  control: boolean;
}
