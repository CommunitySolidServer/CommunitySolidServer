import type { Readable, Writable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { getLoggerFor } from '../logging/LogUtil';

const logger = getLoggerFor('StreamUtil');

/**
 * Joins all strings of a stream.
 * @param stream - Stream of strings.
 *
 * @returns The joined string.
 */
export const readableToString = async(stream: Readable): Promise<string> => (await arrayifyStream(stream)).join('');

/**
 * Pipes one stream into another and emits errors of the first stream with the second.
 * In case of an error in the first stream the second one will be destroyed with the given error.
 * @param readable - Initial readable stream.
 * @param destination - The destination for writing data.
 * @param mapError - Optional function that takes the error and converts it to a new error.
 *
 * @returns The destination stream.
 */
export const pipeSafely = <T extends Writable>(readable: NodeJS.ReadableStream, destination: T,
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
