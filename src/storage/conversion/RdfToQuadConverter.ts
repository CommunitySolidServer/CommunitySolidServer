import { PassThrough } from 'stream';
import rdfParser from 'rdf-parse';
import type { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { pipeSafely } from '../../util/StreamUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

/**
 * Converts most major RDF serializations to `internal/quads`.
 */
export class RdfToQuadConverter extends TypedRepresentationConverter {
  public constructor() {
    super(rdfParser.getContentTypesPrioritized(), INTERNAL_QUADS);
  }

  public async handle({ representation, identifier }: RepresentationConverterArgs): Promise<Representation> {
    const metadata = new RepresentationMetadata(representation.metadata, INTERNAL_QUADS);
    const rawQuads = rdfParser.parse(representation.data, {
      contentType: representation.metadata.contentType!,
      baseIRI: identifier.path,
    });

    const pass = new PassThrough({ objectMode: true });
    const data = pipeSafely(rawQuads, pass, (error): Error => new BadRequestHttpError(error.message));

    return {
      binary: false,
      data,
      metadata,
    };
  }
}
