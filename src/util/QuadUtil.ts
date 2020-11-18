import type { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { DataFactory, StreamParser, StreamWriter } from 'n3';
import type { Literal, NamedNode, Quad } from 'rdf-js';
import streamifyArray from 'streamify-array';
import { TEXT_TURTLE } from './ContentTypes';
import { pipeSafely } from './StreamUtil';

/**
 * Generates a quad with the given subject/predicate/object and pushes it to the given array.
 */
export const pushQuad =
  (quads: Quad[], subject: NamedNode, predicate: NamedNode, object: NamedNode | Literal): number =>
    quads.push(DataFactory.quad(subject, predicate, object));

/**
 * Helper function for serializing an array of quads, with as result a Readable object.
 * @param quads - The array of quads.
 *
 * @returns The Readable object.
 */
export const serializeQuads = (quads: Quad[]): Readable =>
  pipeSafely(streamifyArray(quads), new StreamWriter({ format: TEXT_TURTLE }));

/**
 * Helper function to convert a Readable into an array of quads.
 * @param readable - The readable object.
 *
 * @returns A promise containing the array of quads.
 */
export const parseQuads = async(readable: Readable): Promise<Quad[]> =>
  arrayifyStream(pipeSafely(readable, new StreamParser({ format: TEXT_TURTLE })));
