import type { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import type { ParserOptions } from 'n3';
import { StreamParser, StreamWriter } from 'n3';
import type { Quad } from 'rdf-js';
import type { Guarded } from './GuardedStream';
import { guardedStreamFrom, pipeSafely } from './StreamUtil';

/**
 * Helper function for serializing an array of quads, with as result a Readable object.
 * @param quads - The array of quads.
 * @param contentType - The content-type to serialize to.
 *
 * @returns The Readable object.
 */
export function serializeQuads(quads: Quad[], contentType?: string): Guarded<Readable> {
  return pipeSafely(guardedStreamFrom(quads), new StreamWriter({ format: contentType }));
}

/**
 * Helper function to convert a Readable into an array of quads.
 * @param readable - The readable object.
 * @param options - Options for the parser.
 *
 * @returns A promise containing the array of quads.
 */
export async function parseQuads(readable: Guarded<Readable>, options: ParserOptions = {}): Promise<Quad[]> {
  return arrayifyStream(pipeSafely(readable, new StreamParser(options)));
}

/**
 * Filter out duplicate quads from an array.
 * @param quads - Quads to filter.
 *
 * @returns A new array containing the unique quads.
 */
export function uniqueQuads(quads: Quad[]): Quad[] {
  return quads.reduce<Quad[]>((result, quad): Quad[] => {
    if (!result.some((item): boolean => quad.equals(item))) {
      result.push(quad);
    }
    return result;
  }, []);
}
