import { IdentifierMap } from '../util/map/IdentifierMap';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { PermissionMap, PermissionSet } from './permissions/Permissions';

/**
 * PermissionReader which sets all permissions to true or false
 * independently of the identifier and requested permissions.
 */
export class AllStaticReader extends PermissionReader {
  private readonly permissionSet: PermissionSet;

  public constructor(allow: boolean) {
    super();
    this.permissionSet = Object.freeze({
      read: allow,
      write: allow,
      append: allow,
      create: allow,
      delete: allow,
    });
  }

  public async handle({ requestedModes }: PermissionReaderInput): Promise<PermissionMap> {
    const availablePermissions = new IdentifierMap<PermissionSet>();
    for (const [ identifier ] of requestedModes) {
      availablePermissions.set(identifier, this.permissionSet);
    }
    return availablePermissions;
  }
}
