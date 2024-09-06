import type { DuplexOptions, ReadableOptions, Writable } from 'node:stream';
import { Readable, Transform } from 'node:stream';
import { promisify } from 'node:util';
import arrayifyStream from 'arrayify-stream';
import eos from 'end-of-stream';
import { Store } from 'n3';
import pump from 'pump';
import { getLoggerFor } from '../logging/LogUtil';
import { isHttpRequest } from '../server/HttpRequest';
import { InternalServerError } from './errors/InternalServerError';
import type { Guarded } from './GuardedStream';
import { guardStream } from './GuardedStream';
import type { Json } from './Json';
import type { PromiseOrValue } from './PromiseUtil';

export const endOfStream = promisify(eos);

const logger = getLoggerFor('StreamUtil');

/**
 * Joins all strings of a stream.
 *
 * @param stream - Stream of strings.
 *
 * @returns The joined string.
 */
export async function readableToString(stream: Readable): Promise<string> {
  return (await arrayifyStream<string>(stream)).join('');
}

/**
 * Imports quads from a stream into a Store.
 *
 * @param stream - Stream of quads.
 *
 * @returns A Store containing all the quads.
 */
export async function readableToQuads(stream: Readable): Promise<Store> {
  const quads = new Store();
  quads.import(stream);
  await endOfStream(stream);
  return quads;
}

/**
 * Interprets the stream as JSON and converts it to a Dict.
 *
 * @param stream - Stream of JSON data.
 *
 * @returns The parsed object.
 */
export async function readJsonStream(stream: Readable): Promise<Json> {
  const body = await readableToString(stream);
  return JSON.parse(body) as Json;
}

/**
 * Converts the stream to a single object.
 * This assumes the stream is in object mode and only contains a single element,
 * otherwise an error will be thrown.
 *
 * @param stream - Object stream with single entry.
 */
export async function getSingleItem(stream: Readable): Promise<unknown> {
  const items = await arrayifyStream(stream);
  if (items.length !== 1) {
    throw new InternalServerError('Expected a stream with a single object.');
  }
  return items[0] as unknown;
}

// These error messages usually indicate expected behaviour so should not give a warning.
// We compare against the error message instead of the code
// since the second one is from an external library that does not assign an error code.
// At the time of writing the first one gets thrown in Node 16 and the second one in Node 14.
const safeErrors = new Set([
  'Cannot call write after a stream was destroyed',
  'premature close',
]);

/**
 * Pipes one stream into another and emits errors of the first stream with the second.
 * If the first stream errors, the second one will be destroyed with the given error.
 * This will also make the stream {@link Guarded}.
 *
 * @param readable - Initial readable stream.
 * @param destination - The destination for writing data.
 * @param mapError - Optional function that takes the error and converts it to a new error.
 *
 * @returns The destination stream.
 */
export function pipeSafely<T extends Writable>(
  readable: NodeJS.ReadableStream,
  destination: T,
  mapError?: (error: Error) => Error,
): Guarded<T> {
  // We never want to closes the incoming HttpRequest if there is an error
  // since that also closes the outgoing HttpResponse.
  // Since `pump` sends stream errors both up and down the pipe chain,
  // in this case we need to make sure the error only goes down the chain.
  if (isHttpRequest(readable)) {
    readable.pipe(destination);
    readable.on('error', (error): void => {
      logger.warn(`HttpRequest errored with ${error.message}`);
      // From https://nodejs.org/api/stream.html#stream_readable_pipe_destination_options :
      // One important caveat is that if the Readable stream emits an error during processing,
      // the Writable destination is not closed automatically. If an error occurs,
      // it will be necessary to manually close each stream in order to prevent memory leaks.
      destination.destroy(mapError ? mapError(error) : error);
    });
  } else {
    // In case the input readable is guarded, it will no longer log errors since `pump` attaches a new error listener
    pump(readable, destination, (error): void => {
      if (error) {
        const msg = `Piped stream errored with ${error.message}`;
        logger.log(safeErrors.has(error.message) ? 'debug' : 'warn', msg);

        // Make sure the final error can be handled in a normal streaming fashion
        destination.emit('error', mapError ? mapError(error) : error);
      }
    });
  }
  // Guarding the stream now means the internal error listeners of pump will be ignored
  // when checking if there is a valid error listener.
  return guardStream(destination);
}

export interface AsyncTransformOptions<T = unknown> extends DuplexOptions {
  /**
   * Transforms data from the source by calling the `push` method
   */
  transform?: (this: Transform, data: T, encoding: string) => PromiseOrValue<unknown>;

  /**
   * Performs any final actions after the source has ended
   */
  flush?: (this: Transform) => PromiseOrValue<unknown>;
}

/**
 * Transforms a stream, ensuring that all errors are forwarded.
 *
 * @param source - The stream to be transformed.
 * @param options - The transformation options.
 * @param options.transform - The transform function to use.
 * @param options.flush - The flush function to use.
 *
 * @returns The transformed stream
 */
export function transformSafely<T = unknown>(
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
    async transform(data: T, encoding, callback): Promise<void> {
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
 *
 * @param contents - Data to stream.
 * @param options - Options to pass to the Readable constructor. See {@link Readable.from}.
 */
export function guardedStreamFrom(contents: string | Iterable<unknown>, options?: ReadableOptions): Guarded<Readable> {
  return guardStream(Readable.from(typeof contents === 'string' ? [ contents ] : contents, options));
}
