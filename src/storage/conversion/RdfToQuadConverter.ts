import { PassThrough } from 'stream';
import rdfParser from 'rdf-parse';
import { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { CONTENT_TYPE } from '../../util/UriConstants';
import { pipeStreamsAndErrors } from '../../util/Util';
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
    return { [INTERNAL_QUADS]: 1 };
  }

  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    checkRequest(input, await rdfParser.getContentTypes(), [ INTERNAL_QUADS ]);
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

    // Wrap the stream such that errors are transformed
    // (Node 10 requires both writableObjectMode and readableObjectMode)
    const data = new PassThrough({ writableObjectMode: true, readableObjectMode: true });
    pipeStreamsAndErrors(rawQuads, data);

    return {
      binary: false,
      data,
      metadata,
    };
  }
}
