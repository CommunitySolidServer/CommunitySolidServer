import type { PermissionSet } from '../ldp/permissions/PermissionSet';
import { Authorizer } from './Authorizer';
import { WebAclAuthorization } from './WebAclAuthorization';

const allowAll: PermissionSet = {
  read: true,
  write: true,
  append: true,
  control: true,
};

/**
 * Authorizer which allows all access independent of the identifier and requested permissions.
 */
export class AllowAllAuthorizer extends Authorizer {
  public async handle(): Promise<WebAclAuthorization> {
    return new WebAclAuthorization(allowAll, allowAll);
  }
}
