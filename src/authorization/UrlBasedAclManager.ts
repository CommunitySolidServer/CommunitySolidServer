import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import type { AclManager } from './AclManager';

/**
 * Generates acl URIs by adding an .acl file extension.
 *
 * Needs to be updated according to issue #113.
 */
export class UrlBasedAclManager implements AclManager {
  public async getAclDocument(id: ResourceIdentifier): Promise<ResourceIdentifier> {
    return await this.isAclDocument(id) ? id : { path: `${id.path}.acl` };
  }

  public async isAclDocument(id: ResourceIdentifier): Promise<boolean> {
    return /\.acl\/?/u.test(id.path);
  }

  public async getAclConstrainedResource(id: ResourceIdentifier): Promise<ResourceIdentifier> {
    if (!await this.isAclDocument(id)) {
      return id;
    }

    // Slice off `.acl`
    return { path: id.path.slice(0, -4) };
  }
}
