import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import type { AuxiliaryStrategy } from '../../auxiliary/AuxiliaryStrategy';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

export class AuxiliaryLinkMetadataWriter extends MetadataWriter {
  protected readonly logger = getLoggerFor(this);

  private readonly auxiliaryStrategy: AuxiliaryStrategy;
  private readonly metadataStrategy: AuxiliaryStrategy;

  public constructor(auxiliaryStrategy: AuxiliaryStrategy, metadataStrategy: AuxiliaryStrategy) {
    super();
    this.auxiliaryStrategy = auxiliaryStrategy;
    this.metadataStrategy = metadataStrategy;
  }

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const identifier = { path: input.metadata.identifier.value };
    if (!this.auxiliaryStrategy.isAuxiliaryIdentifier(identifier)) {
      const metadataIdentifier = this.metadataStrategy.getAuxiliaryIdentifier(identifier);

      addHeader(input.response, 'Link', `<${metadataIdentifier.path}>; rel="describedBy"`);
      addHeader(input.response, 'Link', `<${identifier.path}.acl>; rel="acl"`);
    }
  }
}
