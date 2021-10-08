import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { APPLICATION_JSON, INTERNAL_ERROR } from '../../util/ContentTypes';
import { HttpError } from '../../util/errors/HttpError';
import { getSingleItem } from '../../util/StreamUtil';
import type { RepresentationConverterArgs } from './RepresentationConverter';
import { TypedRepresentationConverter } from './TypedRepresentationConverter';

/**
 * Converts an Error object to JSON by copying its fields.
 */
export class ErrorToJsonConverter extends TypedRepresentationConverter {
  public constructor() {
    super(INTERNAL_ERROR, APPLICATION_JSON);
  }

  public async handle({ representation }: RepresentationConverterArgs): Promise<Representation> {
    const error = await getSingleItem(representation.data) as Error;

    const result: Record<string, any> = {
      name: error.name,
      message: error.message,
    };

    if (HttpError.isInstance(error)) {
      result.statusCode = error.statusCode;
      result.errorCode = error.errorCode;
      if (error.details) {
        try {
          // The details might not be serializable
          JSON.stringify(error.details);
          result.details = error.details;
        } catch {
          // Do not store the details
        }
      }
    } else {
      result.statusCode = 500;
    }

    if (error.stack) {
      result.stack = error.stack;
    }

    // Update the content-type to JSON
    return new BasicRepresentation(JSON.stringify(result), representation.metadata, APPLICATION_JSON);
  }
}
