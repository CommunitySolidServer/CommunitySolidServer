import type { Quad } from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import type { Response } from 'cross-fetch';
import rdfDereferencer from 'rdf-dereference';
import { BasicRepresentation } from '../http/representation/BasicRepresentation';
import type { Representation } from '../http/representation/Representation';
import { getLoggerFor } from '../logging/LogUtil';
import type { RepresentationConverter } from '../storage/conversion/RepresentationConverter';
import { INTERNAL_QUADS } from './ContentTypes';
import { BadRequestHttpError } from './errors/BadRequestHttpError';
import { createErrorMessage } from './errors/ErrorUtil';

const logger = getLoggerFor('FetchUtil');

/**
 * Fetches an RDF dataset from the given URL.
 *
 * Response will be a Representation with content-type internal/quads.
 */
export async function fetchDataset(url: string): Promise<Representation> {
  // Try content negotiation to parse quads from the URL
  return (async(): Promise<Representation> => {
    try {
      const quadStream = (await rdfDereferencer.dereference(url)).data;
      const quadArray = await arrayifyStream<Quad>(quadStream);
      return new BasicRepresentation(quadArray, { path: url }, INTERNAL_QUADS, false);
    } catch (error: unknown) {
      throw new BadRequestHttpError(
        `Could not parse resource at URL (${url})! ${createErrorMessage(error)}`,
        { cause: error },
      );
    }
  })();
}

/**
 * Converts a given Response (from a request that was already made) to  an RDF dataset.
 * In case the given Response object was already parsed its body can be passed along as a string.
 *
 * The converter will be used to convert the response body to RDF.
 *
 * Response will be a Representation with content-type internal/quads.
 */
export async function responseToDataset(response: Response, converter: RepresentationConverter, body?: string):
Promise<Representation> {
  if (!body) {
    body = await response.text();
  }

  // Keeping the error message the same everywhere to prevent leaking possible information about intranet.
  const error = new BadRequestHttpError(`Unable to access data at ${response.url}`);

  if (response.status !== 200) {
    logger.warn(`Cannot fetch ${response.url}: ${body}`);
    throw error;
  }

  const contentType = response.headers.get('content-type');
  if (!contentType) {
    logger.warn(`Missing content-type header from ${response.url}`);
    throw error;
  }

  // Try to convert to quads
  const representation = new BasicRepresentation(body, contentType);
  const preferences = { type: { [INTERNAL_QUADS]: 1 }};
  return converter.handleSafe({ representation, identifier: { path: response.url }, preferences });
}
