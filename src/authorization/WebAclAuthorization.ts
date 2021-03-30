import type { PermissionSet } from '../ldp/permissions/PermissionSet';
import type { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import { ACL, AUTH } from '../util/Vocabularies';
import type { Authorization } from './Authorization';

/**
 * Indicates which permissions are available on the requested resource.
 */
export class WebAclAuthorization implements Authorization {
  /**
   * Permissions granted to the agent requesting the resource.
   */
  public user: PermissionSet;
  /**
   * Permissions granted to the public.
   */
  public everyone: PermissionSet;

  public constructor(user: PermissionSet, everyone: PermissionSet) {
    this.user = user;
    this.everyone = everyone;
  }

  public addMetadata(metadata: RepresentationMetadata): void {
    for (const mode of (Object.keys(this.user) as (keyof PermissionSet)[])) {
      const capitalizedMode = mode.charAt(0).toUpperCase() + mode.slice(1) as 'Read' | 'Write' | 'Append' | 'Control';
      if (this.user[mode]) {
        metadata.add(AUTH.terms.userMode, ACL.terms[capitalizedMode]);
      }
      if (this.everyone[mode]) {
        metadata.add(AUTH.terms.publicMode, ACL.terms[capitalizedMode]);
      }
    }
  }
}
