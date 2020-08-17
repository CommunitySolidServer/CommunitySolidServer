import { checkRequest } from './ConversionUtil';
import { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { StreamWriter } from 'n3';
import { CONTENT_TYPE_QUADS, DATA_TYPE_BINARY } from '../../util/ContentTypes';
import { RepresentationConverter, RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Converts `internal/quads` to `text/turtle`.
 */
export class QuadToTurtleConverter extends RepresentationConverter {
  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    checkRequest(input, [ CONTENT_TYPE_QUADS ], [ 'text/turtle' ]);
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    return this.quadsToTurtle(input.representation);
  }

  private quadsToTurtle(quads: Representation): Representation {
    const metadata: RepresentationMetadata = { ...quads.metadata, contentType: 'text/turtle' };
    return {
      dataType: DATA_TYPE_BINARY,
      data: quads.data.pipe(new StreamWriter({ format: 'text/turtle' })),
      metadata,
    };
  }
}
