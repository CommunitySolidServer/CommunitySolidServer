import { PassThrough } from 'stream';
import { StreamParser } from 'n3';
import { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { TEXT_TURTLE, INTERNAL_QUADS } from '../../util/ContentTypes';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { MA_CONTENT_TYPE } from '../../util/MetadataTypes';
import { checkRequest } from './ConversionUtil';
import { RepresentationConverter, RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Converts `text/turtle` to `internal/quads`.
 */
export class TurtleToQuadConverter extends RepresentationConverter {
  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    checkRequest(input, [ TEXT_TURTLE ], [ INTERNAL_QUADS ]);
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    return this.turtleToQuads(input.representation, input.identifier.path);
  }

  private turtleToQuads(turtle: Representation, baseIRI: string): Representation {
    const metadata = new RepresentationMetadata(turtle.metadata, { [MA_CONTENT_TYPE]: INTERNAL_QUADS });

    // Catch parsing errors and emit correct error
    // Node 10 requires both writableObjectMode and readableObjectMode
    const errorStream = new PassThrough({ writableObjectMode: true, readableObjectMode: true });
    const data = turtle.data.pipe(new StreamParser({ format: TEXT_TURTLE, baseIRI }));
    data.pipe(errorStream);
    data.on('error', (error): boolean => errorStream.emit('error', new UnsupportedHttpError(error.message)));

    return {
      binary: false,
      data: errorStream,
      metadata,
    };
  }
}
