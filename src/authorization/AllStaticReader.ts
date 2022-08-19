import { IdentifierMap } from '../util/map/IdentifierMap';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import { permissionSetKeys } from './permissions/Permissions';
import type { Permission, PermissionMap, PermissionSet } from './permissions/Permissions';

/**
 * PermissionReader which sets all permissions to true or false
 * independently of the identifier and requested permissions.
 */
export class AllStaticReader extends PermissionReader {
  private readonly permissions: Permission;

  public constructor(allow: boolean) {
    super();
    this.permissions = Object.freeze({
      read: allow,
      write: allow,
      append: allow,
      create: allow,
      delete: allow,
    });
  }

  public async handle({ requestedModes }: PermissionReaderInput): Promise<PermissionMap> {
    const availablePermissions = new IdentifierMap<PermissionSet>();
    const permissions = this.createPermissions();
    for (const [ identifier ] of requestedModes) {
      availablePermissions.set(identifier, permissions);
    }
    return availablePermissions;
  }

  private createPermissions(): PermissionSet {
    const result: PermissionSet = {};
    for (const group of permissionSetKeys) {
      result[group] = this.permissions;
    }
    return result;
  }
}
