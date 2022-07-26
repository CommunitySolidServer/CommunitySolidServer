import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import type { AuxiliaryStrategy } from '../../auxiliary/AuxiliaryStrategy';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

export class AuxiliaryLinkMetadataWriter extends MetadataWriter {
  protected readonly logger = getLoggerFor(this);

  private readonly auxiliaryStrategy: AuxiliaryStrategy;
  private readonly specificStrategy: AuxiliaryStrategy;
  private readonly relationType: string;

  public constructor(auxiliaryStrategy: AuxiliaryStrategy, specificStrategy: AuxiliaryStrategy, relationType: string) {
    super();
    this.auxiliaryStrategy = auxiliaryStrategy;
    this.specificStrategy = specificStrategy;
    this.relationType = relationType;
  }

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const identifier = { path: input.metadata.identifier.value };
    if (!this.auxiliaryStrategy.isAuxiliaryIdentifier(identifier)) {
      const auxiliaryIdentifier = this.specificStrategy.getAuxiliaryIdentifier(identifier);
      addHeader(input.response, 'Link', `<${auxiliaryIdentifier.path}>; rel="${this.relationType}"`);
    }
  }
}
