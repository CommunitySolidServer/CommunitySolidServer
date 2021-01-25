import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import type { AuxiliaryIdentifierStrategy } from '../../auxiliary/AuxiliaryIdentifierStrategy';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

/**
 * A MetadataWriter that always adds a rel="acl" link header to a response.
 * The `rel` parameter can be used if a different `rel` value is needed (such as http://www.w3.org/ns/solid/terms#acl).
 */
export class AclLinkMetadataWriter extends MetadataWriter {
  private readonly aclStrategy: AuxiliaryIdentifierStrategy;
  private readonly rel: string;

  public constructor(aclStrategy: AuxiliaryIdentifierStrategy, rel = 'acl') {
    super();
    this.aclStrategy = aclStrategy;
    this.rel = rel;
  }

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const identifier = this.aclStrategy.getAuxiliaryIdentifier({ path: input.metadata.identifier.value });
    addHeader(input.response, 'Link', `<${identifier.path}>; rel="${this.rel}"`);
  }
}
