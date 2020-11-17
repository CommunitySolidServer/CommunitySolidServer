import type { Writable, ReadableOptions } from 'stream';
import { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { getLoggerFor } from '../logging/LogUtil';
import type { Guarded } from './GuardedStream';
import { guardStream } from './GuardedStream';

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
 * This will also make the stream {@link Guarded}.
 * @param readable - Initial readable stream.
 * @param destination - The destination for writing data.
 * @param mapError - Optional function that takes the error and converts it to a new error.
 *
 * @returns The destination stream.
 */
export const pipeSafely = <T extends Writable>(readable: NodeJS.ReadableStream, destination: T,
  mapError?: (error: Error) => Error): Guarded<T> => {
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
  return guardStream(destination);
};

/**
 * Converts an iterable to a stream and applies an error guard so that it is {@link Guarded}.
 * @param iterable - Data to stream.
 * @param options - Options to pass to the Readable constructor. See {@link Readable.from}.
 */
export const guardedStreamFrom = (iterable: Iterable<any>, options?: ReadableOptions): Guarded<Readable> =>
  guardStream(Readable.from(iterable, options));
