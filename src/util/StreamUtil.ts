import type { Writable, ReadableOptions, DuplexOptions } from 'stream';
import { Readable, Transform } from 'stream';
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
export async function readableToString(stream: Readable): Promise<string> {
  return (await arrayifyStream(stream)).join('');
}

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
export function pipeSafely<T extends Writable>(readable: NodeJS.ReadableStream, destination: T,
  mapError?: (error: Error) => Error): Guarded<T> {
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

  // Make sure we have no dangling streams in case of unpiping, which can happen if there's an error.
  // This can also happen if a stream naturally closes so most calls here will not be indication of a problem.
  // From https://nodejs.org/api/stream.html#stream_errors_while_writing :
  // "If a Readable stream pipes into a Writable stream when Writable emits an error,
  // the Readable stream will be unpiped."
  destination.on('unpipe', (source): void => {
    source.destroy();
  });

  return guardStream(destination);
}

export interface AsyncTransformOptions<T = any> extends DuplexOptions {
  /**
   * Transforms data from the source by calling the `push` method
   */
  transform?: (this: Transform, data: T, encoding: string) => any | Promise<any>;

  /**
   * Performs any final actions after the source has ended
   */
  flush?: (this: Transform) => any | Promise<any>;
}

/**
 * Transforms a stream, ensuring that all errors are forwarded.
 * @param source - The stream to be transformed
 * @param options - The transformation options
 *
 * @returns The transformed stream
 */
export function transformSafely<T = any>(
  source: NodeJS.ReadableStream,
  {
    transform = function(data): void {
      this.push(data);
    },
    flush = (): null => null,
    ...options
  }: AsyncTransformOptions<T> = {},
):
  Guarded<Transform> {
  return pipeSafely(source, new Transform({
    ...options,
    async transform(data, encoding, callback): Promise<void> {
      let error: Error | null = null;
      try {
        await transform.call(this, data, encoding);
      } catch (err: unknown) {
        error = err as Error;
      }
      callback(error);
    },
    async flush(callback): Promise<void> {
      let error: Error | null = null;
      try {
        await flush.call(this);
      } catch (err: unknown) {
        error = err as Error;
      }
      callback(error);
    },
  }));
}

/**
 * Converts a string or array to a stream and applies an error guard so that it is {@link Guarded}.
 * @param contents - Data to stream.
 * @param options - Options to pass to the Readable constructor. See {@link Readable.from}.
 */
export function guardedStreamFrom(contents: string | Iterable<any>, options?: ReadableOptions): Guarded<Readable> {
  return guardStream(Readable.from(typeof contents === 'string' ? [ contents ] : contents, options));
}
