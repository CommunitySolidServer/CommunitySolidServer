import type { PermissionMap } from '@solidlab/policy-engine';
import { StatusUnionHandler } from '../util/handlers/StatusUnionHandler';
import { IdentifierMap } from '../util/map/IdentifierMap';
import { getDefault } from '../util/map/MapUtil';
import type { PermissionReader } from './PermissionReader';
import type { MultiPermissionMap } from './permissions/Permissions';

/**
 * Combines the results of multiple PermissionReaders.
 * Every permission in every credential type is handled according to the rule `false` \> `true` \> `undefined`.
 */
export class UnionPermissionReader extends StatusUnionHandler<PermissionReader> {
  public constructor(readers: PermissionReader[]) {
    super(readers, false, false);
  }

  protected async combine(results: MultiPermissionMap[]): Promise<MultiPermissionMap> {
    const result: MultiPermissionMap = new IdentifierMap();
    for (const permissionMap of results) {
      this.mergePermissionMaps(permissionMap, result);
    }
    return result;
  }

  /**
   * Merges all entries of the given map into the result map.
   */
  protected mergePermissionMaps(permissionMap: MultiPermissionMap, result: MultiPermissionMap): void {
    for (const [ identifier, permissionSet ] of permissionMap) {
      const resultSet = getDefault(result, identifier, (): PermissionMap => ({}));
      result.set(identifier, this.mergePermissions(permissionSet, resultSet));
    }
  }

  /**
   * Adds the given permissions to the result object according to the combination rules of the class.
   */
  protected mergePermissions(permissions: PermissionMap, result: PermissionMap): PermissionMap {
    for (const [ key, value ] of Object.entries(permissions)) {
      // Value can also be undefined
      // eslint-disable-next-line ts/no-unnecessary-boolean-literal-compare
      if (typeof value !== 'undefined' && result[key] !== false) {
        result[key] = value;
      }
    }
    return result;
  }
}
