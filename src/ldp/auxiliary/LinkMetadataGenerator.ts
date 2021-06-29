import { namedNode } from '@rdfjs/data-model';
import { SOLID_META } from '../../util/Vocabularies';
import type { RepresentationMetadata } from '../representation/RepresentationMetadata';
import type { AuxiliaryIdentifierStrategy } from './AuxiliaryIdentifierStrategy';
import { MetadataGenerator } from './MetadataGenerator';

/**
 * Adds a link to the auxiliary resource when called on the associated resource.
 * Specifically: <associatedId> <link> <auxiliaryId> will be added.
 *
 * In case the input is metadata of an auxiliary resource no metadata will be added
 */
export class LinkMetadataGenerator extends MetadataGenerator {
  private readonly link: string;
  private readonly identifierStrategy: AuxiliaryIdentifierStrategy;

  public constructor(link: string, identifierStrategy: AuxiliaryIdentifierStrategy) {
    super();
    this.link = link;
    this.identifierStrategy = identifierStrategy;
  }

  public async handle(metadata: RepresentationMetadata): Promise<void> {
    const identifier = { path: metadata.identifier.value };
    if (!this.identifierStrategy.isAuxiliaryIdentifier(identifier)) {
      metadata.add(this.link,
        namedNode(this.identifierStrategy.getAuxiliaryIdentifier(identifier).path),
        SOLID_META.terms.ResponseMetadata);
    }
  }
}
