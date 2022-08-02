import { Util } from 'n3';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import type { AuxiliaryStrategy } from '../../auxiliary/AuxiliaryStrategy';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

/**
 * A {@link MetadataWriter} that takes a specific auxiliaryStrategy and relation type as input and
 * creates a Link header with the strategy identifier and the relation type as "rel" value.
 */
export class AuxiliaryLinkMetadataWriter extends MetadataWriter {
  protected readonly logger = getLoggerFor(this);

  private readonly auxiliaryStrategy: AuxiliaryStrategy;
  private readonly specificStrategy: AuxiliaryStrategy;
  private readonly relationType: string;

  /**
   * @param auxiliaryStrategy - The strategy used to check if an identifier is any kind of auxiliary identifier.
   * @param specificStrategy - The strategy used to create pme specific kind of auxiliary identifier.
   * @param relationType - The value used to create the "rel" value of the Link header.
   */
  public constructor(auxiliaryStrategy: AuxiliaryStrategy, specificStrategy: AuxiliaryStrategy, relationType: string) {
    super();
    this.auxiliaryStrategy = auxiliaryStrategy;
    this.specificStrategy = specificStrategy;
    this.relationType = relationType;
  }

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const identifier = { path: input.metadata.identifier.value };
    // The check for blank nodes is executed in order to not have blank nodes in Link headers when an error occurred.
    if (!this.auxiliaryStrategy.isAuxiliaryIdentifier(identifier) && !Util.isBlankNode(input.metadata.identifier)) {
      const auxiliaryIdentifier = this.specificStrategy.getAuxiliaryIdentifier(identifier);
      addHeader(input.response, 'Link', `<${auxiliaryIdentifier.path}>; rel="${this.relationType}"`);
    }
  }
}
