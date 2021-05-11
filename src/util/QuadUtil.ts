import type { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import type { ParserOptions } from 'n3';
import { StreamParser, StreamWriter } from 'n3';
import type { Quad } from 'rdf-js';
import streamifyArray from 'streamify-array';
import type { Guarded } from './GuardedStream';
import { pipeSafely } from './StreamUtil';

export function serializeQuads(quads: Quad[], contentType?: string): Guarded<Readable> {
  return pipeSafely(streamifyArray(quads), new StreamWriter({ format: contentType }));
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
