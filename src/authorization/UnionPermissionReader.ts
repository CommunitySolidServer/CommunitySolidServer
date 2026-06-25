import { UnionHandler } from '../util/handlers/UnionHandler';
import { IdentifierMap } from '../util/map/IdentifierMap';
import { getDefault } from '../util/map/MapUtil';
import type { PermissionReader } from './PermissionReader';
import type { PermissionSetWithComparisons } from './permissions/ComparisonPermissions';
import { COMPARISON_PERMISSIONS } from './permissions/ComparisonPermissions';
import type { PermissionMap, PermissionSet } from './permissions/Permissions';

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
      const resultSet = getDefault(result, identifier, (): PermissionSet => ({}));
      result.set(identifier, this.mergePermissions(permissionSet, resultSet));
    }
  }

  /**
   * Adds the given permissions to the result object according to the combination rules of the class.
   */
  private mergePermissions(permissions: PermissionSet, result: PermissionSet): PermissionSet {
    for (const [ key, value ] of Object.entries(permissions) as [ keyof PermissionSet, boolean | undefined ][]) {
      if (typeof value !== 'undefined' && result[key] !== false) {
        result[key] = value;
      }
    }
    // Symbol-keyed comparison permissions (from `credentialsToCompare`) are not enumerated by `Object.entries`,
    // so they must be merged explicitly to survive the union. Each entry is merged using the same rules,
    // index-aligned, so the comparison result is identical to a full separate pass for those credentials.
    this.mergeComparisons(permissions, result);
    return result;
  }

  /**
   * Merges the {@link COMPARISON_PERMISSIONS} arrays of two permission sets, index by index,
   * using the same `false` \> `true` \> `undefined` rule as the primary permissions.
   * Ensures the comparison permissions carried for `credentialsToCompare` compose across readers
   * exactly as a separate full pass for those credentials would.
   */
  private mergeComparisons(permissions: PermissionSet, result: PermissionSet): void {
    const incoming = (permissions as PermissionSetWithComparisons)[COMPARISON_PERMISSIONS];
    if (!incoming) {
      return;
    }
    const target = result as PermissionSetWithComparisons;
    const existing = target[COMPARISON_PERMISSIONS];
    if (!existing) {
      // Copy each comparison set so later in-place merges never mutate a source reader's objects.
      target[COMPARISON_PERMISSIONS] = incoming.map((set): PermissionSet => ({ ...set }));
      return;
    }
    for (const [ index, set ] of incoming.entries()) {
      existing[index] = this.mergePermissions(set, existing[index] ?? {});
    }
  }
}
