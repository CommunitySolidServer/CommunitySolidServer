import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { APPLICATION_JSON, INTERNAL_ERROR } from '../../util/ContentTypes';
import type { HttpError } from '../../util/errors/HttpError';
import { extractErrorTerms } from '../../util/errors/HttpErrorUtil';
import { OAuthHttpError } from '../../util/errors/OAuthHttpError';
import { getSingleItem } from '../../util/StreamUtil';
import { BaseTypedRepresentationConverter } from './BaseTypedRepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

/**
 * Converts an Error object to JSON by copying its fields.
 */
export class ErrorToJsonConverter extends BaseTypedRepresentationConverter {
  public constructor() {
    super(INTERNAL_ERROR, APPLICATION_JSON);
  }

  public async handle({ representation }: RepresentationConverterArgs): Promise<Representation> {
    const error = await getSingleItem(representation.data) as HttpError;

    const result: Record<string, any> = {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      details: extractErrorTerms(error.metadata),
    };

    // OAuth errors responses require additional fields
    if (OAuthHttpError.isInstance(error)) {
      Object.assign(result, error.mandatoryFields);
    }

    if (error.stack) {
      result.stack = error.stack;
    }

    // Update the content-type to JSON
    return new BasicRepresentation(JSON.stringify(result), representation.metadata, APPLICATION_JSON);
  }
}
