import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { APPLICATION_JSON, INTERNAL_ERROR } from '../../util/ContentTypes';
import { isError } from '../../util/errors/ErrorUtil';
import { HttpError } from '../../util/errors/HttpError';
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

    const result = this.errorToJson(error);

    // Update the content-type to JSON
    return new BasicRepresentation(JSON.stringify(result), representation.metadata, APPLICATION_JSON);
  }

  private errorToJson(error: unknown): unknown {
    if (!isError(error)) {
      // Try to see if we can make valid JSON, empty object if there is an error.
      try {
        return JSON.parse(JSON.stringify(error));
      } catch {
        return {};
      }
    }

    const result: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };

    if (error.stack) {
      result.stack = error.stack;
    }

    if (!HttpError.isInstance(error)) {
      return result;
    }

    result.statusCode = error.statusCode;
    result.errorCode = error.errorCode;
    result.details = extractErrorTerms(error.metadata);

    // OAuth errors responses require additional fields
    if (OAuthHttpError.isInstance(error)) {
      Object.assign(result, error.mandatoryFields);
    }

    if (error.cause) {
      result.cause = this.errorToJson(error.cause);
    }

    return result;
  }
}
