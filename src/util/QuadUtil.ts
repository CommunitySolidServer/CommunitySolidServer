import type { Readable, PassThrough } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { DataFactory, StreamParser, StreamWriter } from 'n3';
import type { Literal, NamedNode, Quad } from 'rdf-js';
import streamifyArray from 'streamify-array';
import type { Guarded } from './GuardedStream';
import { pipeSafely } from './StreamUtil';
import { toSubjectTerm, toPredicateTerm, toObjectTerm } from './TermUtil';

/**
 * Generates a quad with the given subject/predicate/object and pushes it to the given array.
 */
export function pushQuad(
  quads: Quad[] | PassThrough,
  subject: string | NamedNode,
  predicate: string | NamedNode,
  object: string | NamedNode | Literal,
): void {
  quads.push(DataFactory.quad(toSubjectTerm(subject), toPredicateTerm(predicate), toObjectTerm(object)));
}

/**
 * Helper function for serializing an array of quads, with as result a Readable object.
 * @param quads - The array of quads.
 * @param contentType - The content-type to serialize to.
 *
 * @returns The Readable object.
 */
export function serializeQuads(quads: Quad[], contentType?: string): Guarded<Readable> {
  return pipeSafely(streamifyArray(quads), new StreamWriter({ format: contentType }));
}

/**
 * Helper function to convert a Readable into an array of quads.
 * @param readable - The readable object.
 * @param contentType - The content-type of the stream.
 *
 * @returns A promise containing the array of quads.
 */
export async function parseQuads(readable: Guarded<Readable>, contentType?: string): Promise<Quad[]> {
  return arrayifyStream(pipeSafely(readable, new StreamParser({ format: contentType })));
}
