import { Readable, Writable, PassThrough } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { StreamWriter, StreamParser } from 'n3';
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
 * Will pipe two streams.
 * Makes sure an error of the first stream gets passed to the second.
 * @param streamA - .
 * @param streamB - .
 *
 * @returns streamB which will also emit an error if there's an error in streamA.
 */
export const pipeStreams =
(streamA: Readable | Writable, streamB: StreamWriter | StreamParser | PassThrough): Readable => {
  streamA.pipe(streamB);
  streamA.on('error', (error): boolean => streamB.emit('error', new UnsupportedHttpError(error.message)));
  return streamB;
};
