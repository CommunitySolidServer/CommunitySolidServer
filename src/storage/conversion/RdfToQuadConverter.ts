import { PassThrough } from 'stream';
import type { NamedNode } from '@rdfjs/types';
import rdfParser from 'rdf-parse';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { pipeSafely } from '../../util/StreamUtil';
import { PREFERRED_PREFIX_TERM, SOLID_META } from '../../util/Vocabularies';
import { BaseTypedRepresentationConverter } from './BaseTypedRepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Converts most major RDF serializations to `internal/quads`.
 */
export class RdfToQuadConverter extends BaseTypedRepresentationConverter {
  public constructor() {
    const inputTypes = rdfParser.getContentTypes()
      // ContentType application/json MAY NOT be converted to Quad.
      .then((types): string[] => types.filter((type): boolean => type !== 'application/json'));
    super(inputTypes, INTERNAL_QUADS);
  }

  public async handle({ representation, identifier }: RepresentationConverterArgs): Promise<Representation> {
    const newMetadata = new RepresentationMetadata(representation.metadata, INTERNAL_QUADS);
    const rawQuads = rdfParser.parse(representation.data, {
      contentType: representation.metadata.contentType!,
      baseIRI: identifier.path,
    })
      // This works only for those cases where the data stream has been completely read before accessing the metadata.
      // Eg. the PATCH operation, which is the main case why we store the prefixes in metadata here if there are any.
      // See also https://github.com/CommunitySolidServer/CommunitySolidServer/issues/126
      .on('prefix', (prefix, iri: NamedNode): void => {
        newMetadata.addQuad(iri.value, PREFERRED_PREFIX_TERM, prefix, SOLID_META.terms.ResponseMetadata);
      });

    const pass = new PassThrough({ objectMode: true });
    const data = pipeSafely(rawQuads, pass, (error): Error => new BadRequestHttpError(error.message));

    return new BasicRepresentation(data, newMetadata);
  }
}
