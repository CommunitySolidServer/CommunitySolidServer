import { AsyncHandler } from '../../util/AsyncHandler';
import { Operation } from '../operations/Operation';
import { PermissionSet } from './PermissionSet';

/**
 * Verifies which permissions are requested on a given {@link Operation}.
 */
export abstract class PermissionsExtractor extends AsyncHandler<Operation, PermissionSet> {}
