import type { PermissionMap } from '@solidlab/policy-engine';
import { PERMISSIONS } from '@solidlab/policy-engine';
import { IdentifierMap } from '../util/map/IdentifierMap';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { MultiPermissionMap } from './permissions/Permissions';

/**
 * PermissionReader which sets all permissions to true or false
 * independently of the identifier and requested permissions.
 */
export class AllStaticReader extends PermissionReader {
  protected readonly permissionMap: PermissionMap;

  public constructor(allow: boolean) {
    super();
    this.permissionMap = Object.freeze({
      [PERMISSIONS.Read]: allow,
      [PERMISSIONS.Modify]: allow,
      [PERMISSIONS.Append]: allow,
      [PERMISSIONS.Create]: allow,
      [PERMISSIONS.Delete]: allow,
    });
  }

  public async handle({ requestedModes }: PermissionReaderInput): Promise<MultiPermissionMap> {
    const availablePermissions = new IdentifierMap<PermissionMap>();
    for (const [ identifier ] of requestedModes) {
      availablePermissions.set(identifier, this.permissionMap);
    }
    return availablePermissions;
  }
}
