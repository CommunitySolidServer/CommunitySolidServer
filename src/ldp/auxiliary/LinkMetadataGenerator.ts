import { namedNode } from '@rdfjs/data-model';
import type { NamedNode } from 'rdf-js';
import type { RepresentationMetadata } from '../representation/RepresentationMetadata';
import type { AuxiliaryIdentifierStrategy } from './AuxiliaryIdentifierStrategy';
import type { MetadataGenerator } from './MetadataGenerator';

/**
 * Adds a link to the auxiliary resource when called on the associated resource.
 * Specifically: <associatedId> <link> <auxiliaryId> will be added.
 *
 * In case the input is metadata of an auxiliary resource no metadata will be added
 */
export class LinkMetadataGenerator implements MetadataGenerator {
  private readonly link: string;
  private readonly identifierStrategy: AuxiliaryIdentifierStrategy;

  public constructor(link: string, identifierStrategy: AuxiliaryIdentifierStrategy) {
    this.link = link;
    this.identifierStrategy = identifierStrategy;
  }

  public async add(metadata: RepresentationMetadata): Promise<void> {
    const object = this.getObject(metadata);
    if (object) {
      metadata.add(this.link, object);
    }
  }

  public async remove(metadata: RepresentationMetadata): Promise<void> {
    const object = this.getObject(metadata);
    if (object) {
      metadata.remove(this.link, object);
    }
  }

  private getObject(metadata: RepresentationMetadata): NamedNode | undefined {
    const identifier = { path: metadata.identifier.value };
    if (!this.identifierStrategy.isAuxiliaryIdentifier(identifier)) {
      return namedNode(this.identifierStrategy.getAuxiliaryIdentifier(identifier).path);
    }
  }
}
