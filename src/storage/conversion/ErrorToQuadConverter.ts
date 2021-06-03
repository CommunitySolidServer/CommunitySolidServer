import arrayifyStream from 'arrayify-stream';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { INTERNAL_ERROR, INTERNAL_QUADS } from '../../util/ContentTypes';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { DC, SOLID_ERROR } from '../../util/Vocabularies';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

/**
 * Converts an error object into quads by creating a triple for each of name/message/stack.
 */
export class ErrorToQuadConverter extends TypedRepresentationConverter {
  public constructor() {
    super(INTERNAL_ERROR, INTERNAL_QUADS);
  }

  public async handle({ identifier, representation }: RepresentationConverterArgs): Promise<Representation> {
    const errors = await arrayifyStream(representation.data);
    if (errors.length !== 1) {
      throw new InternalServerError('Only single errors are supported.');
    }
    const error = errors[0] as Error;

    // A metadata object makes it easier to add triples due to the utility functions
    const data = new RepresentationMetadata(identifier);
    data.add(DC.terms.title, error.name);
    data.add(DC.terms.description, error.message);
    if (error.stack) {
      data.add(SOLID_ERROR.terms.stack, error.stack);
    }

    // Update the content-type to quads
    return new BasicRepresentation(data.quads(), representation.metadata, INTERNAL_QUADS, false);
  }
}
