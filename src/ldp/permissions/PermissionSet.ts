/**
 * A data interface indicating which permissions are allowed (based on the context).
 */
export interface PermissionSet {
  read: boolean;
  append: boolean;
  write: boolean;
  delete: boolean;
}
