import type { Readable, Writable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import type { Literal, NamedNode, Quad } from 'rdf-js';
import { getLoggerFor } from '../logging/LogUtil';
import type { HttpResponse } from '../server/HttpResponse';

const logger = getLoggerFor('Util');

/**
 * Makes sure the input path has exactly 1 slash at the end.
 * Multiple slashes will get merged into one.
 * If there is no slash it will be added.
 *
 * @param path - Path to check.
 *
 * @returns The potentially changed path.
 */
export const ensureTrailingSlash = (path: string): string => path.replace(/\/*$/u, '/');

/**
 * Joins all strings of a stream.
 * @param stream - Stream of strings.
 *
 * @returns The joined string.
 */
export const readableToString = async(stream: Readable): Promise<string> => (await arrayifyStream(stream)).join('');

/**
 * Makes sure the input path has no slashes at the end.
 *
 * @param path - Path to check.
 *
 * @returns The potentially changed path.
 */
export const trimTrailingSlashes = (path: string): string => path.replace(/\/+$/u, '');

/**
 * Checks if the given two media types/ranges match each other.
 * Takes wildcards into account.
 * @param mediaA - Media type to match.
 * @param mediaB - Media type to match.
 *
 * @returns True if the media type patterns can match each other.
 */
export const matchingMediaType = (mediaA: string, mediaB: string): boolean => {
  const [ typeA, subTypeA ] = mediaA.split('/');
  const [ typeB, subTypeB ] = mediaB.split('/');
  if (typeA === '*' || typeB === '*') {
    return true;
  }
  if (typeA !== typeB) {
    return false;
  }
  if (subTypeA === '*' || subTypeB === '*') {
    return true;
  }
  return subTypeA === subTypeB;
};

/**
 * Pipes one stream into another and emits errors of the first stream with the second.
 * In case of an error in the first stream the second one will be destroyed with the given error.
 * @param readable - Initial readable stream.
 * @param destination - The destination for writing data.
 * @param mapError - Optional function that takes the error and converts it to a new error.
 *
 * @returns The destination stream.
 */
export const pipeSafe = <T extends Writable>(readable: NodeJS.ReadableStream, destination: T,
  mapError?: (error: Error) => Error): T => {
  // Not using `stream.pipeline` since the result there only emits an error event if the last stream has the error
  readable.pipe(destination);
  readable.on('error', (error): void => {
    logger.warn(`Piped stream errored with ${error.message}`);

    // From https://nodejs.org/api/stream.html#stream_readable_pipe_destination_options :
    // "One important caveat is that if the Readable stream emits an error during processing, the Writable destination
    // is not closed automatically. If an error occurs, it will be necessary to manually close each stream
    // in order to prevent memory leaks."
    destination.destroy(mapError ? mapError(error) : error);
  });
  return destination;
};

/**
 * Converts a URI path to the canonical version by splitting on slashes,
 * decoding any percent-based encodings,
 * and then encoding any special characters.
 */
export const toCanonicalUriPath = (path: string): string => path.split('/').map((part): string =>
  encodeURIComponent(decodeURIComponent(part))).join('/');

/**
 * Decodes all components of a URI path.
 */
export const decodeUriPathComponents = (path: string): string => path.split('/').map(decodeURIComponent).join('/');

/**
 * Encodes all (non-slash) special characters in a URI path.
 */
export const encodeUriPathComponents = (path: string): string => path.split('/').map(encodeURIComponent).join('/');

/**
 * Generates a quad with the given subject/predicate/object and pushes it to the given array.
 */
export const pushQuad =
  (quads: Quad[], subject: NamedNode, predicate: NamedNode, object: NamedNode | Literal): number =>
    quads.push(DataFactory.quad(subject, predicate, object));

/**
 * Adds a header value without overriding previous values.
 */
export const addHeader = (response: HttpResponse, name: string, value: string | string[]): void => {
  let allValues: string[] = [];
  if (response.hasHeader(name)) {
    let oldValues = response.getHeader(name)!;
    if (typeof oldValues === 'string') {
      oldValues = [ oldValues ];
    } else if (typeof oldValues === 'number') {
      oldValues = [ `${oldValues}` ];
    }
    allValues = oldValues;
  }
  if (Array.isArray(value)) {
    allValues.push(...value);
  } else {
    allValues.push(value);
  }
  response.setHeader(name, allValues.length === 1 ? allValues[0] : allValues);
};
