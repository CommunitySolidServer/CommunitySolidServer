import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import { INTERNAL_ERROR, INTERNAL_QUADS } from '../../util/ContentTypes';
import { getSingleItem } from '../../util/StreamUtil';
import { DC, SOLID_ERROR } from '../../util/Vocabularies';
import { BaseTypedRepresentationConverter } from './BaseTypedRepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Converts an error object into quads by creating a triple for each of name/message/stack.
 */
export class ErrorToQuadConverter extends BaseTypedRepresentationConverter {
  public constructor() {
    super(INTERNAL_ERROR, INTERNAL_QUADS);
  }

  public async handle({ identifier, representation }: RepresentationConverterArgs): Promise<Representation> {
    const error = await getSingleItem(representation.data) as Error;

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
