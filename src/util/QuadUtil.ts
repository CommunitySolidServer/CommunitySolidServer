import type { Readable } from 'node:stream';
import type { NamedNode, Quad, Term } from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import type { ParserOptions } from 'n3';
import { StreamParser, StreamWriter } from 'n3';
import type { Guarded } from './GuardedStream';
import { guardedStreamFrom, pipeSafely } from './StreamUtil';
import { toNamedTerm } from './TermUtil';

/**
 * Helper function for serializing an array of quads, with as result a Readable object.
 *
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
 *
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
 *
 * @param quads - Quads to filter.
 *
 * @returns A new array containing the unique quads.
 */
export function uniqueQuads(quads: Quad[]): Quad[] {
  const uniques: Quad[] = [];
  for (const quad of quads) {
    if (!uniques.some((item): boolean => quad.equals(item))) {
      uniques.push(quad);
    }
  }
  return uniques;
}

/**
 * Converts a term to a number. Returns undefined if the term was undefined.
 *
 * @param term - Term to parse.
 * @param radix - Radix to use when parsing. Default is 10.
 */
export function termToInt(term?: Term, radix = 10): number | undefined {
  if (term) {
    return Number.parseInt(term.value, radix);
  }
}

/**
 * Represents a triple pattern to be used as a filter.
 */
export class FilterPattern {
  public readonly subject: NamedNode | null;
  public readonly predicate: NamedNode | null;
  public readonly object: NamedNode | null;

  /**
   * @param subject - Optionally filter based on a specific subject.
   * @param predicate - Optionally filter based on a predicate.
   * @param object - Optionally filter based on a specific object.
   */
  public constructor(subject?: string, predicate?: string, object?: string) {
    this.subject = typeof subject === 'string' ? toNamedTerm(subject) : null;
    this.predicate = typeof predicate === 'string' ? toNamedTerm(predicate) : null;
    this.object = typeof object === 'string' ? toNamedTerm(object) : null;
  }
}
