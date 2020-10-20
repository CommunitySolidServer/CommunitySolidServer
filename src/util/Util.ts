import type { Readable, Writable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import type { Literal, NamedNode, Quad } from 'rdf-js';
import { getLoggerFor } from '../logging/LogUtil';

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
 * Pipes one stream into another.
 * Makes sure an error of the first stream gets passed to the second.
 * @param readable - Initial readable stream.
 * @param destination - The destination for writing data.
 * @param mapError - Optional function that takes the error and converts it to a new error.
 *
 * @returns The destination stream.
 */
export const pipeStreamsAndErrors = <T extends Writable>(readable: NodeJS.ReadableStream, destination: T,
  mapError?: (error: Error) => Error): T => {
  readable.pipe(destination);
  readable.on('error', (error): boolean => {
    logger.warn(`Piped stream errored with ${error.message}`);
    return destination.emit('error', mapError ? mapError(error) : error);
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
