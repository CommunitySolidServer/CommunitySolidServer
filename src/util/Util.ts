import { Readable, Writable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { UnsupportedHttpError } from './errors/UnsupportedHttpError';

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
 *
 * @returns The destination stream.
 */
export const pipeStreamsAndErrors = <T extends Writable>(readable: Readable, destination: T): T => {
  readable.pipe(destination);
  readable.on('error', (error): boolean => destination.emit('error', new UnsupportedHttpError(error.message)));
  return destination;
};
