import type { Permission } from '../ldp/permissions/Permissions';
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
  public user: Permission;
  /**
   * Permissions granted to the public.
   */
  public everyone: Permission;

  public constructor(user: Permission, everyone: Permission) {
    this.user = user;
    this.everyone = everyone;
  }

  public addMetadata(metadata: RepresentationMetadata): void {
    const modes = new Set([ ...Object.keys(this.user), ...Object.keys(this.everyone) ] as (keyof Permission)[]);
    for (const mode of modes) {
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
