import { PassThrough } from 'stream';
import rdfParser from 'rdf-parse';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { pipeSafely } from '../../util/StreamUtil';
import { BaseTypedRepresentationConverter } from './BaseTypedRepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Converts most major RDF serializations to `internal/quads`.
 */
export class RdfToQuadConverter extends BaseTypedRepresentationConverter {
  public constructor() {
    super(rdfParser.getContentTypesPrioritized(), INTERNAL_QUADS);
  }

  public async handle({ representation, identifier }: RepresentationConverterArgs): Promise<Representation> {
    const rawQuads = rdfParser.parse(representation.data, {
      contentType: representation.metadata.contentType!,
      baseIRI: identifier.path,
    });
    const pass = new PassThrough({ objectMode: true });
    const data = pipeSafely(rawQuads, pass, (error): Error => new BadRequestHttpError(error.message));

    return new BasicRepresentation(data, representation.metadata, INTERNAL_QUADS);
  }
}
