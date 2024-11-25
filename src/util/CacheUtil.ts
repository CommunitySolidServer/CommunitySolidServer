import type { Readable } from 'node:stream';
import { PassThrough } from 'node:stream';
import { getLoggerFor } from 'global-logger-factory';
import { BasicRepresentation } from '../http/representation/BasicRepresentation';
import type { Representation } from '../http/representation/Representation';
import { RepresentationMetadata } from '../http/representation/RepresentationMetadata';
import { createErrorMessage } from './errors/ErrorUtil';
import { guardedStreamFrom, pipeSafely } from './StreamUtil';

const logger = getLoggerFor('CacheUtil');

/**
 * The cached version of a representation.
 */
export interface CachedRepresentation {
  /**
   * The data of the representation.
   * In case the stream was in object mode the value will be an array, otherwise a buffer.
   */
  data: Buffer | unknown[];
  metadata: RepresentationMetadata;
}

/**
 * Function that can be used as `sizeCalculation` for an LRU cache storing {@link CachedRepresentation}s.
 * The length of the data is used, so in the case of an array, the size of the entries is not taken into account.
 *
 * @param cached - The cached entry to determine the size of.
 */
export function calculateCachedRepresentationSize<T extends CachedRepresentation>(cached: T): number {
  // Needs to be a positive integer
  return cached.data.length + 1;
}

/**
 * Reads a data stream into an array or buffer, depending on if it is in object mode or not.
 *
 * @param stream - Data stream to read.
 */
export async function readStream(stream: Readable): Promise<Buffer | unknown[]> {
  if (stream.readableObjectMode) {
    const data: unknown[] = [];
    for await (const obj of stream) {
      data.push(obj);
    }
    return data;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
    } else if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    }
  }
  return Buffer.concat(chunks);
}

/**
 * Generates a {@link Representation} based on a {@link CachedRepresentation}.
 * The generated value is not linked to the {@link CachedRepresentation},
 * so any changes to it will not impact the original.
 *
 * @param cached - {@link CachedRepresentation} to create a representation from
 */
export function cachedToRepresentation(cached: CachedRepresentation): Representation {
  // Copy the metadata quads to prevent changes to the original cached metadata
  const metadata = new RepresentationMetadata(cached.metadata);
  return new BasicRepresentation(guardedStreamFrom(cached.data, { objectMode: Array.isArray(cached.data) }), metadata);
}

/**
 * Generates a {@link CachedRepresentation} based on a {@link Representation}.
 * The generated value is not linked to the {@link Representation},
 * so any changes to it will not impact the original.
 *
 * Returns undefined if there was an error, implying the data was not fully read.
 *
 * @param representation - Representation to convert.
 */
export async function representationToCached(representation: Representation):
Promise<CachedRepresentation | undefined> {
  try {
    const data = await readStream(representation.data);
    const metadata = new RepresentationMetadata(representation.metadata);
    return { data, metadata };
  } catch (error: unknown) {
    // This just means the request was not interested in the data and closed the stream
    if ((error as Error).message !== 'Premature close') {
      logger.error(`Unable to cache representation for ${
        representation.metadata.identifier.value}: ${createErrorMessage(error)}`);
    }
  }
}

/**
 * Generates 2 {@link Representation}s from a single one.
 * After this the input representation should not be used any more.
 *
 * @param representation - Representation do duplicate.
 */
export function duplicateRepresentation(representation: Representation): [ Representation, Representation ] {
  const stream1 = pipeSafely(
    representation.data,
    new PassThrough({ objectMode: representation.data.readableObjectMode }),
  );
  const stream2 = pipeSafely(
    representation.data,
    new PassThrough({ objectMode: representation.data.readableObjectMode }),
  );
  return [
    new BasicRepresentation(stream1, new RepresentationMetadata(representation.metadata)),
    new BasicRepresentation(stream2, new RepresentationMetadata(representation.metadata)),
  ];
}
