import { ACL, AUTH } from '../../../util/Vocabularies';
import type { AccessMode } from '../../permissions/Permissions';

import type { OperationMetadataCollectorInput } from './OperationMetadataCollector';
import { OperationMetadataCollector } from './OperationMetadataCollector';

const VALID_METHODS = new Set([ 'HEAD', 'GET' ]);

/**
 * Indicates which acl permissions are available on the requested resource.
 * Only adds public and agent permissions for HEAD/GET requests.
 */
export class WebAclMetadataCollector extends OperationMetadataCollector {
  public async handle({ metadata, operation }: OperationMetadataCollectorInput): Promise<void> {
    if (!operation.permissionSet || !VALID_METHODS.has(operation.method)) {
      return;
    }
    const user = operation.permissionSet.agent ?? {};
    const everyone = operation.permissionSet.public ?? {};

    const modes = new Set<AccessMode>([ ...Object.keys(user), ...Object.keys(everyone) ] as AccessMode[]);

    for (const mode of modes) {
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
