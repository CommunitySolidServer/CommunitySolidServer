import type { PermissionMap } from '@solidlab/policy-engine';
import type { IdentifierMap, IdentifierSetMultiMap } from '../../util/map/IdentifierMap';

/**
 * Permissions per identifier.
 */
export type AccessMap = IdentifierSetMultiMap<string>;

/**
 * PermissionMap per identifier.
 */
export type MultiPermissionMap = IdentifierMap<PermissionMap>;
