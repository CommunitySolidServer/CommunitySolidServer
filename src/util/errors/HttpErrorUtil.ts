import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import { toPredicateTerm } from '../TermUtil';
import { SOLID_ERROR_TERM } from '../Vocabularies';
import { BadRequestHttpError } from './BadRequestHttpError';
import { createErrorMessage } from './ErrorUtil';
import { HttpError } from './HttpError';
import { InternalServerError } from './InternalServerError';
import Dict = NodeJS.Dict;

/**
 * Adds the given terms to error metadata.
 * The keys will be converted to predicates by prepending them with the `SOLID_ERROR_TERM` namespace.
 * The values will become literals.
 *
 * @param terms - Terms to add to the metadata.
 * @param metadata - Metadata to add the terms to. A new metadata object will be created if this is undefined.
 */
export function errorTermsToMetadata(terms: Dict<string>, metadata?: RepresentationMetadata): RepresentationMetadata {
  metadata = metadata ?? new RepresentationMetadata();
  for (const [ key, value ] of Object.entries(terms)) {
    if (value) {
      metadata.add(toPredicateTerm(`${SOLID_ERROR_TERM.namespace}${key}`), value);
    }
  }
  return metadata;
}

/**
 * Extracts all the error metadata terms and converts them to a simple object.
 * All predicates in the `SOLID_ERROR_TERM` namespace will be found.
 * The namespace will be removed from the predicate and the remainder will be used as a key.
 * The object literal values will be used as values in the resulting object.
 *
 * @param metadata - Metadata to extract the terms from.
 */
export function extractErrorTerms(metadata: RepresentationMetadata): Dict<string> {
  const errorQuads = metadata.quads()
    .filter((quad): boolean => quad.predicate.value.startsWith(SOLID_ERROR_TERM.namespace));

  const errorTerms: Dict<string> = {};
  for (const quad of errorQuads) {
    errorTerms[quad.predicate.value.slice(SOLID_ERROR_TERM.namespace.length)] = quad.object.value;
  }
  return errorTerms;
}

/**
 * Combines a list of errors into a single HttpError.
 * Status code depends on the input errors. If they all share the same status code that code will be re-used.
 * If they are all within the 4xx range, 400 will be used, otherwise 500.
 *
 * @param errors - Errors to combine.
 */
export function createAggregateError(errors: Error[]): HttpError {
  const httpErrors = errors.map((error): HttpError =>
    HttpError.isInstance(error) ? error : new InternalServerError(createErrorMessage(error)));
  const messages = httpErrors.map((error: Error): string => error.message).filter((msg): boolean => msg.length > 0);

  // Let message depend on the messages that were present.
  // This prevents a bunch of empty strings being joined in the case most of them were 404s.
  let message: string;
  if (messages.length === 0) {
    message = '';
  } else if (messages.length === 1) {
    message = messages[0];
  } else {
    message = `Multiple handler errors: ${messages.join(', ')}`;
  }

  // Check if all errors have the same status code
  if (httpErrors.length > 0 && httpErrors.every((error): boolean => error.statusCode === httpErrors[0].statusCode)) {
    return new HttpError(httpErrors[0].statusCode, httpErrors[0].name, message);
  }

  // Find the error range (4xx or 5xx)
  if (httpErrors.some((error): boolean => error.statusCode >= 500)) {
    return new InternalServerError(message);
  }
  return new BadRequestHttpError(message);
}
