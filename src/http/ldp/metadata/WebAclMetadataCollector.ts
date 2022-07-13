import { AclMode } from '../../../authorization/permissions/AclPermission';
import type { AclPermission } from '../../../authorization/permissions/AclPermission';
import { AccessMode } from '../../../authorization/permissions/Permissions';
import { ACL, AUTH } from '../../../util/Vocabularies';

import type { OperationMetadataCollectorInput } from './OperationMetadataCollector';
import { OperationMetadataCollector } from './OperationMetadataCollector';

const VALID_METHODS = new Set([ 'HEAD', 'GET' ]);
const VALID_ACL_MODES = new Set([ AccessMode.read, AccessMode.write, AccessMode.append, AclMode.control ]);

/**
 * Indicates which acl permissions are available on the requested resource.
 * Only adds public and agent permissions for HEAD/GET requests.
 */
export class WebAclMetadataCollector extends OperationMetadataCollector {
  public async handle({ metadata, operation }: OperationMetadataCollectorInput): Promise<void> {
    const permissionSet = operation.availablePermissions?.get(operation.target);
    if (!permissionSet || !VALID_METHODS.has(operation.method)) {
      return;
    }
    const user: AclPermission = permissionSet.agent ?? {};
    const everyone: AclPermission = permissionSet.public ?? {};

    const modes = new Set<AccessMode>([ ...Object.keys(user), ...Object.keys(everyone) ] as AccessMode[]);

    for (const mode of modes) {
      if (VALID_ACL_MODES.has(mode)) {
        const capitalizedMode = mode.charAt(0).toUpperCase() + mode.slice(1) as 'Read' | 'Write' | 'Append' | 'Control';
        if (everyone[mode]) {
          metadata.add(AUTH.terms.publicMode, ACL.terms[capitalizedMode]);
        }
        if (user[mode]) {
          metadata.add(AUTH.terms.userMode, ACL.terms[capitalizedMode]);
        }
      }
    }
  }
}
