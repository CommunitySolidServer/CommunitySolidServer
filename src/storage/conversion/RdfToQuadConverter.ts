import { PassThrough } from 'stream';
import rdfParser from 'rdf-parse';
import type { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { pipeSafely } from '../../util/StreamUtil';
import { CONTENT_TYPE } from '../../util/UriConstants';
import { supportsConversion } from './ConversionUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

/**
 * Converts most major RDF serializations to `internal/quads`.
 */
export class RdfToQuadConverter extends TypedRepresentationConverter {
  public async getInputTypes(): Promise<Record<string, number>> {
    return rdfParser.getContentTypesPrioritized();
  }

  public async getOutputTypes(): Promise<Record<string, number>> {
    return { [INTERNAL_QUADS]: 1 };
  }

  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    supportsConversion(input, await rdfParser.getContentTypes(), [ INTERNAL_QUADS ]);
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    return this.rdfToQuads(input.representation, input.identifier.path);
  }

  private rdfToQuads(representation: Representation, baseIRI: string): Representation {
    const metadata = new RepresentationMetadata(representation.metadata, { [CONTENT_TYPE]: INTERNAL_QUADS });
    const rawQuads = rdfParser.parse(representation.data, {
      contentType: representation.metadata.contentType!,
      baseIRI,
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
