import { checkRequest } from './ConversionUtil';
import { PassThrough } from 'stream';
import { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { StreamParser } from 'n3';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { CONTENT_TYPE_QUADS, DATA_TYPE_QUAD } from '../../util/ContentTypes';
import { RepresentationConverter, RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Converts `text/turtle` to `internal/quads`.
 */
export class TurtleToQuadConverter extends RepresentationConverter {
  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    checkRequest(input, [ 'text/turtle' ], [ CONTENT_TYPE_QUADS ]);
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    return this.turtleToQuads(input.representation, input.identifier.path);
  }

  private turtleToQuads(turtle: Representation, baseIRI: string): Representation {
    const metadata: RepresentationMetadata = { ...turtle.metadata, contentType: CONTENT_TYPE_QUADS };

    // Catch parsing errors and emit correct error
    // Node 10 requires both writableObjectMode and readableObjectMode
    const errorStream = new PassThrough({ writableObjectMode: true, readableObjectMode: true });
    const data = turtle.data.pipe(new StreamParser({ format: 'text/turtle', baseIRI }));
    data.pipe(errorStream);
    data.on('error', (error): boolean => errorStream.emit('error', new UnsupportedHttpError(error.message)));

    return {
      dataType: DATA_TYPE_QUAD,
      data: errorStream,
      metadata,
    };
  }
}
