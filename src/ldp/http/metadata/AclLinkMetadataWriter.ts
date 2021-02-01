import type { AclManager } from '../../../authorization/AclManager';
import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

/**
 * A MetadataWriter that always adds a rel="acl" link header to a response.
 * The `rel` parameter can be used if a different `rel` value is needed (such as http://www.w3.org/ns/solid/terms#acl).
 */
export class AclLinkMetadataWriter extends MetadataWriter {
  private readonly aclManager: AclManager;
  private readonly rel: string;

  public constructor(aclManager: AclManager, rel = 'acl') {
    super();
    this.aclManager = aclManager;
    this.rel = rel;
  }

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const identifier = await this.aclManager.getAclDocument({ path: input.metadata.identifier.value });
    addHeader(input.response, 'Link', `<${identifier.path}>; rel="${this.rel}"`);
  }
}
