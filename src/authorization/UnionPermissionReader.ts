import type { CredentialGroup } from '../authentication/Credentials';
import type { Permission, PermissionSet } from '../ldp/permissions/Permissions';
import { UnionHandler } from '../util/handlers/UnionHandler';
import type { PermissionReader } from './PermissionReader';

/**
 * Combines the results of multiple PermissionReaders.
 * Every permission in every credential type is handled according to the rule `false` \> `true` \> `undefined`.
 */
export class UnionPermissionReader extends UnionHandler<PermissionReader> {
  public constructor(readers: PermissionReader[]) {
    super(readers);
  }

  protected async combine(results: PermissionSet[]): Promise<PermissionSet> {
    const result: PermissionSet = {};
    for (const permissionSet of results) {
      for (const [ key, value ] of Object.entries(permissionSet) as [ CredentialGroup, Permission | undefined ][]) {
        result[key] = this.applyPermissions(value, result[key]);
      }
    }
    return result;
  }

  /**
   * Adds the given permissions to the result object according to the combination rules of the class.
   */
  private applyPermissions(permissions?: Permission, result: Permission = {}): Permission {
    if (!permissions) {
      return result;
    }

    for (const [ key, value ] of Object.entries(permissions) as [ keyof Permission, boolean | undefined ][]) {
      if (typeof value !== 'undefined' && result[key] !== false) {
        result[key] = value;
      }
    }
    return result;
  }
}
