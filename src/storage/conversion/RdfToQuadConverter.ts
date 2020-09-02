import { PassThrough } from 'stream';
import rdfParser from 'rdf-parse';
import { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { CONTENT_TYPE_QUADS } from '../../util/ContentTypes';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { checkRequest } from './ConversionUtil';
import { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

/**
 * Converts most major RDF serializations to `internal/quads`.
 */
export class RdfToQuadConverter extends TypedRepresentationConverter {
  public async getInputTypes(): Promise<{ [contentType: string]: number }> {
    return rdfParser.getContentTypesPrioritized();
  }

  public async getOutputTypes(): Promise<{ [contentType: string]: number }> {
    return { [CONTENT_TYPE_QUADS]: 1 };
  }

  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    checkRequest(input, await rdfParser.getContentTypes(), [ CONTENT_TYPE_QUADS ]);
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    return this.rdfToQuads(input.representation, input.identifier.path);
  }

  private rdfToQuads(representation: Representation, baseIRI: string): Representation {
    const metadata: RepresentationMetadata = { ...representation.metadata, contentType: CONTENT_TYPE_QUADS };

    // Catch parsing errors and emit correct error
    // Node 10 requires both writableObjectMode and readableObjectMode
    const errorStream = new PassThrough({ writableObjectMode: true, readableObjectMode: true });
    const data = rdfParser.parse(representation.data, {
      contentType: representation.metadata.contentType as string,
      baseIRI,
    });
    data.pipe(errorStream);
    data.on('error', (error): boolean => errorStream.emit('error', new UnsupportedHttpError(error.message)));

    return {
      binary: false,
      data: errorStream,
      metadata,
    };
  }
}
