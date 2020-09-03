import { PassThrough } from 'stream';
import rdfParser from 'rdf-parse';
import { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { CONTENT_TYPE_QUADS, DATA_TYPE_QUAD } from '../../util/ContentTypes';
import { pipeStreamsAndErrors } from '../../util/Util';
import { checkRequest } from './ConversionUtil';
import { RepresentationConverter, RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Converts most major RDF serializations to `internal/quads`.
 */
export class RdfToQuadConverter extends RepresentationConverter {
  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    checkRequest(input, await rdfParser.getContentTypes(), [ CONTENT_TYPE_QUADS ]);
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    return this.rdfToQuads(input.representation, input.identifier.path);
  }

  private rdfToQuads(representation: Representation, baseIRI: string): Representation {
    const metadata: RepresentationMetadata = { ...representation.metadata, contentType: CONTENT_TYPE_QUADS };
    const rawQuads = rdfParser.parse(representation.data, {
      contentType: representation.metadata.contentType as string,
      baseIRI,
    });

    // Wrap the stream such that errors are transformed
    // (Node 10 requires both writableObjectMode and readableObjectMode)
    const data = new PassThrough({ writableObjectMode: true, readableObjectMode: true });
    pipeStreamsAndErrors(rawQuads, data);

    return {
      dataType: DATA_TYPE_QUAD,
      data,
      metadata,
    };
  }
}
