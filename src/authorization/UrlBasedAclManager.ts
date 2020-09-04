import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { AclManager } from './AclManager';

/**
 * Generates acl URIs by adding an .acl file extension.
 *
 * What actually should happen in getAcl:
 * 1. Return id if it isAcl
 * 2. Check store if id exists
 * 3a. (true) Close/destroy data stream! To prevent potential locking issues.
 * 4a. Check metadata if it is a container or a resource.
 * 3b. (false) Use input metadata/heuristic to check if container or resource.
 * 5. Generate the correct identifier (.acl right of / for containers, left for resources if there is a /)
 *
 * It is potentially possible that an agent wants to generate the acl file before generating the actual file.
 * (Unless this is not allowed by the spec, need to verify).
 */
export class UrlBasedAclManager implements AclManager {
  public async getAcl(id: ResourceIdentifier): Promise<ResourceIdentifier> {
    return await this.isAcl(id) ? id : { path: `${id.path}.acl` };
  }

  public async isAcl(id: ResourceIdentifier): Promise<boolean> {
    return /\.acl\/?/u.test(id.path);
  }
}
