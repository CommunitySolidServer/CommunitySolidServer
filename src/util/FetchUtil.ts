import type { Response } from 'cross-fetch';
import { fetch } from 'cross-fetch';
import { BasicRepresentation } from '../http/representation/BasicRepresentation';
import type { Representation } from '../http/representation/Representation';
import { getLoggerFor } from '../logging/LogUtil';
import type { RepresentationConverter } from '../storage/conversion/RepresentationConverter';
import { INTERNAL_QUADS } from './ContentTypes';
import { BadRequestHttpError } from './errors/BadRequestHttpError';
import { parseContentType } from './HeaderUtil';

const logger = getLoggerFor('FetchUtil');

/**
 * Fetches an RDF dataset from the given URL.
 * Input can also be a Response if the request was already made.
 * In case the given Response object was already parsed its body can be passed along as a string.
 *
 * The converter will be used to convert the response body to RDF.
 *
 * Response will be a Representation with content-type internal/quads.
 */
export async function fetchDataset(url: string, converter: RepresentationConverter): Promise<Representation>;
export async function fetchDataset(response: Response, converter: RepresentationConverter, body?: string):
Promise<Representation>;
export async function fetchDataset(input: string | Response, converter: RepresentationConverter, body?: string):
Promise<Representation> {
  let response: Response;
  if (typeof input === 'string') {
    response = await fetch(input);
  } else {
    response = input;
  }
  if (!body) {
    body = await response.text();
  }

  // Keeping the error message the same everywhere to prevent leaking possible information about intranet.
  const error = new BadRequestHttpError(`Unable to access data at ${response.url}`);

  if (response.status !== 200) {
    logger.warn(`Cannot fetch ${response.url}: ${body}`);
    throw error;
  }

  let contentType = response.headers.get('content-type');
  if (!contentType) {
    logger.warn(`Missing content-type header from ${response.url}`);
    throw error;
  }
  contentType = parseContentType(contentType);

  // Try to convert to quads
  const representation = new BasicRepresentation(body, contentType);
  const preferences = { type: { [INTERNAL_QUADS]: 1 }};
  return converter.handleSafe({ representation, identifier: { path: response.url }, preferences });
}
