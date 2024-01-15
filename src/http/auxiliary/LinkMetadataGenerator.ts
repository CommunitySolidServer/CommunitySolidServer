import { DataFactory } from 'n3';
import type { NamedNode } from '@rdfjs/types';
import { SOLID_META } from '../../util/Vocabularies';
import type { RepresentationMetadata } from '../representation/RepresentationMetadata';
import type { AuxiliaryIdentifierStrategy } from './AuxiliaryIdentifierStrategy';
import { MetadataGenerator } from './MetadataGenerator';

/**
 * Adds a link to the auxiliary resource when called on the subject resource.
 * Specifically: <subjectId> <link> <auxiliaryId> will be added.
 *
 * In case the input is metadata of an auxiliary resource no metadata will be added
 */
export class LinkMetadataGenerator extends MetadataGenerator {
  private readonly link: NamedNode;
  private readonly identifierStrategy: AuxiliaryIdentifierStrategy;

  public constructor(link: string, identifierStrategy: AuxiliaryIdentifierStrategy) {
    super();
    this.link = DataFactory.namedNode(link);
    this.identifierStrategy = identifierStrategy;
  }

  public async handle(metadata: RepresentationMetadata): Promise<void> {
    const identifier = { path: metadata.identifier.value };
    if (!this.identifierStrategy.isAuxiliaryIdentifier(identifier)) {
      metadata.add(
        this.link,
        DataFactory.namedNode(this.identifierStrategy.getAuxiliaryIdentifier(identifier).path),
        SOLID_META.terms.ResponseMetadata,
      );
    }
  }
}
