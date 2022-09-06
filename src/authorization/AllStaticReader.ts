import type { CredentialGroup, CredentialSet } from '../authentication/Credentials';
import { IdentifierMap } from '../util/map/IdentifierMap';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { Permission, PermissionMap, PermissionSet } from './permissions/Permissions';

/**
 * PermissionReader which sets all permissions to true or false
 * independently of the identifier and requested permissions.
 */
export class AllStaticReader extends PermissionReader {
  private readonly permissions: Permission;

  // A triggering comment
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

  public async handle({ credentials, requestedModes }: PermissionReaderInput): Promise<PermissionMap> {
    const availablePermissions = new IdentifierMap<PermissionSet>();
    const permissions = this.createPermissions(credentials);
    for (const [ identifier ] of requestedModes) {
      availablePermissions.set(identifier, permissions);
    }
    return availablePermissions;
  }

  private createPermissions(credentials: CredentialSet): PermissionSet {
    const result: PermissionSet = {};
    for (const group of Object.keys(credentials) as CredentialGroup[]) {
      result[group] = this.permissions;
    }
    return result;
  }
}
