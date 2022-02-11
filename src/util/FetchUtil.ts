import type { Quad, Stream } from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import type { Response } from 'cross-fetch';
import rdfDereferencer from 'rdf-dereference';
import { Readable } from 'stream';
import { ResourceIdentifier } from '..';
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
  if (typeof input === 'string') {
    // Try content negotiation to parse quads from uri
    const quadStream = (await rdfDereferencer.dereference(input)).quads as Readable;
    const quadArray = await arrayifyStream(quadStream) as Quad[];
    // Make Representation object
    const identifier: ResourceIdentifier = { path: input };
    const representation = new BasicRepresentation(quadArray, identifier, INTERNAL_QUADS, false);
    // Return as Promise<Representation>
    return Promise.resolve(representation);
  }

  // Type of input == Response
  if (!body) {
    body = await input.text();
  }

  // Keeping the error message the same everywhere to prevent leaking possible information about intranet.
  const error = new BadRequestHttpError(`Unable to access data at ${input.url}`);

  if (input.status !== 200) {
    logger.warn(`Cannot fetch ${input.url}: ${body}`);
    throw error;
  }

  const contentType = input.headers.get('content-type');
  if (!contentType) {
    logger.warn(`Missing content-type header from ${input.url}`);
    throw error;
  }
  const contentTypeValue = parseContentType(contentType).type;

  // Try to convert to quads
  const representation = new BasicRepresentation(body, contentTypeValue);
  const preferences = { type: { [INTERNAL_QUADS]: 1 }};
  return converter.handleSafe({ representation, identifier: { path: input.url }, preferences });
}
