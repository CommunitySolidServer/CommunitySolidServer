import type { Credentials } from '../authentication/Credentials';
import { AsyncHandler } from '../util/handlers/AsyncHandler';
import type { AccessMap, PermissionMap } from './permissions/Permissions';

export interface PermissionReaderInput {
  /**
   * Credentials of the entity requesting access to resources.
   */
  credentials: Credentials;
  /**
   * For each credential, the reader will check which of the given per-resource access modes are available.
   * However, non-exhaustive information about other access modes and resources can still be returned.
   */
  requestedModes: AccessMap;
  /**
   * Optional list of *additional* credential sets whose permissions should ALSO be evaluated,
   * against the exact same authorization data that is resolved for the primary {@link credentials}.
   *
   * This exists purely as an optimisation to avoid resolving the same effective ACL/ACR more than once
   * when permissions for several credential sets are needed for one resource in a single request
   * (the canonical example being the {@link WacAllowHttpHandler}, which needs both the requesting agent's
   * permissions and the public (`{}`) permissions to build the `WAC-Allow` header).
   *
   * The field is OPTIONAL and the change is fully non-breaking:
   *  - The PRIMARY result returned by a reader is the {@link PermissionMap} for {@link credentials} ONLY,
   *    with semantics identical to a call that omits this field. Authorization decisions are unaffected.
   *  - A reader that does not understand this field MUST keep behaving identically; it simply ignores it
   *    and returns the primary map. The comparison results are then unavailable, which callers must tolerate
   *    (they fall back to evaluating the comparison credentials in a separate call).
   *
   * A reader that DOES support it (currently {@link WebAclReader}) attaches, for each identifier in the
   * primary {@link PermissionMap}, the permission set computed for every entry of this array under the
   * {@link COMPARISON_PERMISSIONS} symbol on that identifier's primary {@link PermissionSet}
   * (index-aligned with this array). See {@link getComparisonPermissions} to read them back out.
   * The attachment is on a non-enumerable {@link Symbol} key, so it is invisible to the authorizer and to
   * the `WAC-Allow` header generation, keeping both byte-identical.
   */
  credentialsToCompare?: Credentials[];
}

/**
 * Discovers the permissions of the given credentials on the given identifier.
 * If the reader finds no permission for the requested identifiers and credentials,
 * it can return an empty or incomplete map.
 */
export abstract class PermissionReader extends AsyncHandler<PermissionReaderInput, PermissionMap> {}
