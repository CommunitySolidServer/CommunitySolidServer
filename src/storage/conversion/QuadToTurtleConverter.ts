import { StreamWriter } from 'n3';
import { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { CONTENT_TYPE_QUADS } from '../../util/ContentTypes';
import { checkRequest } from './ConversionUtil';
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
      binary: true,
      data: quads.data.pipe(new StreamWriter({ format: 'text/turtle' })),
      metadata,
    };
  }
}
