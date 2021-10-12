import type { CredentialGroup } from '../authentication/Credentials';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { Permission, PermissionSet } from './permissions/Permissions';

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

  public async handle({ credentials }: PermissionReaderInput): Promise<PermissionSet> {
    const result: PermissionSet = {};
    for (const [ key, value ] of Object.entries(credentials) as [CredentialGroup, Permission][]) {
      if (value) {
        result[key] = this.permissions;
      }
    }
    return result;
  }
}
