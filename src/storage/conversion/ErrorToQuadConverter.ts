import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import { INTERNAL_ERROR, INTERNAL_QUADS } from '../../util/ContentTypes';
import type { HttpError } from '../../util/errors/HttpError';
import { getSingleItem } from '../../util/StreamUtil';
import { DC, SOLID_ERROR, SOLID_ERROR_TERM } from '../../util/Vocabularies';
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
    const error = await getSingleItem(representation.data) as HttpError;

    // A metadata object makes it easier to add triples due to the utility functions
    const data = new RepresentationMetadata(identifier);
    data.add(DC.terms.title, error.name);
    data.add(DC.terms.description, error.message);
    if (error.stack) {
      data.add(SOLID_ERROR.terms.stack, error.stack);
    }
    // Add all the error terms from the metadata
    data.addQuads(representation.metadata.quads()
      .filter((quad): boolean => quad.predicate.value.startsWith(SOLID_ERROR_TERM.namespace)));

    // Update the content-type to quads
    return new BasicRepresentation(data.quads(), representation.metadata, INTERNAL_QUADS, false);
  }
}
