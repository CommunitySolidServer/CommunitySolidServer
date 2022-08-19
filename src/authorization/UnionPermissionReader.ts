import { UnionHandler } from '../util/handlers/UnionHandler';
import { IdentifierMap } from '../util/map/IdentifierMap';
import { getDefault } from '../util/map/MapUtil';
import type { PermissionReader } from './PermissionReader';
import type { Permission, PermissionMap, PermissionSet } from './permissions/Permissions';

/**
 * Combines the results of multiple PermissionReaders.
 * Every permission in every credential type is handled according to the rule `false` \> `true` \> `undefined`.
 */
export class UnionPermissionReader extends UnionHandler<PermissionReader> {
  public constructor(readers: PermissionReader[]) {
    super(readers);
  }

  protected async combine(results: PermissionMap[]): Promise<PermissionMap> {
    const result: PermissionMap = new IdentifierMap();
    for (const permissionMap of results) {
      this.mergePermissionMaps(permissionMap, result);
    }
    return result;
  }

  /**
   * Merges all entries of the given map into the result map.
   */
  private mergePermissionMaps(permissionMap: PermissionMap, result: PermissionMap): void {
    for (const [ identifier, permissionSet ] of permissionMap) {
      for (const [ credential, permission ] of Object.entries(permissionSet) as [keyof PermissionSet, Permission][]) {
        const resultSet = getDefault(result, identifier, {});
        resultSet[credential] = this.mergePermissions(permission, resultSet[credential]);
      }
    }
  }

  /**
   * Adds the given permissions to the result object according to the combination rules of the class.
   */
  private mergePermissions(permissions?: Permission, result: Permission = {}): Permission {
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
