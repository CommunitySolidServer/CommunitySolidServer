import type { Credentials } from '../../authentication/Credentials';
import type { PermissionSet } from './Permissions';

/**
 * The single "public" (unauthenticated, empty) credential set used as the comparison credentials
 * for the `WAC-Allow` header's `public="..."` value.
 *
 * It is wrapped in a one-element array because {@link PermissionReaderInput.credentialsToCompare}
 * is a list. The {@link AuthorizingHttpHandler} attaches this on its (authenticated) reader call so that
 * the cached permission result already carries the public permissions, allowing the
 * {@link WacAllowHttpHandler} to read them without resolving the effective ACL a second time.
 */
export const PUBLIC_COMPARISON: readonly Credentials[] = Object.freeze([ Object.freeze({}) ]);

/**
 * Symbol key under which a {@link PermissionSet} can carry the permissions that were
 * computed for one or more *comparison* credential sets against the SAME resolved ACL,
 * as requested through {@link PermissionReaderInput.credentialsToCompare}.
 *
 * A `Symbol` (rather than a string) property is used deliberately:
 *  - It is never returned by `Object.keys` / `Object.entries` / `for..in`, so it is invisible
 *    to {@link PermissionBasedAuthorizer} (which reads explicit {@link AccessMode} keys) and to
 *    {@link WacAllowHttpHandler.addWacAllowMetadata} (which iterates `Object.keys` and filters on
 *    the valid ACL modes). The primary permission semantics are therefore completely unchanged.
 *  - It cannot collide with any current or future {@link AccessMode} string key.
 *
 * The value is an array, index-aligned with the `credentialsToCompare` array that produced it,
 * of the {@link PermissionSet} computed for each comparison credential set on that identifier.
 */
export const COMPARISON_PERMISSIONS = Symbol('comparisonPermissions');

/**
 * A {@link PermissionSet} that may additionally carry comparison permission sets
 * under the {@link COMPARISON_PERMISSIONS} symbol.
 */
export interface PermissionSetWithComparisons extends PermissionSet {
  [COMPARISON_PERMISSIONS]?: PermissionSet[];
}

/**
 * Reads the comparison permission sets attached to a {@link PermissionSet}, if any.
 *
 * @param permissionSet - The permission set to read from (may be `undefined`).
 *
 * @returns The array of comparison permission sets, or `undefined` if none were attached.
 */
export function getComparisonPermissions(permissionSet?: PermissionSet): PermissionSet[] | undefined {
  return (permissionSet as PermissionSetWithComparisons | undefined)?.[COMPARISON_PERMISSIONS];
}
