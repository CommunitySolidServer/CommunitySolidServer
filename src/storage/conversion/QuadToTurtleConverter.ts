import { StreamWriter } from 'n3';
import { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { INTERNAL_QUADS, TEXT_TURTLE } from '../../util/ContentTypes';
import { MA_CONTENT_TYPE } from '../../util/MetadataTypes';
import { checkRequest } from './ConversionUtil';
import { RepresentationConverter, RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Converts `internal/quads` to `text/turtle`.
 */
export class QuadToTurtleConverter extends RepresentationConverter {
  public async canHandle(input: RepresentationConverterArgs): Promise<void> {
    checkRequest(input, [ INTERNAL_QUADS ], [ TEXT_TURTLE ]);
  }

  public async handle(input: RepresentationConverterArgs): Promise<Representation> {
    return this.quadsToTurtle(input.representation);
  }

  private quadsToTurtle(quads: Representation): Representation {
    const metadata = new RepresentationMetadata(quads.metadata, { [MA_CONTENT_TYPE]: TEXT_TURTLE });
    return {
      binary: true,
      data: quads.data.pipe(new StreamWriter({ format: TEXT_TURTLE })),
      metadata,
    };
  }
}
