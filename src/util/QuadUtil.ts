import type { Readable } from 'node:stream';
import type { NamedNode, Quad, Term } from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import type { ParserOptions, Store } from 'n3';
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

/**
 * Represents a binding result from a SPARQL query.
 * The keys are the values of the Variable objects,
 * while the values are the terms mapped to those variables in a query result.
 */
export type SimpleBinding = Record<string, Term>;

/**
 * Finds the matching bindings in the given data set for the given BGP query.
 *
 * @param bgp - BGP to solve
 * @param data - Dataset to query.
 */
export function solveBgp(bgp: Quad[], data: Store): SimpleBinding[] {
  let result: SimpleBinding[] = [{}];
  for (const pattern of bgp) {
    const newResult: SimpleBinding[] = [];
    for (const binding of result) {
      newResult.push(...getAppliedBindings(pattern, binding, data));
    }
    result = newResult;
  }
  return result;
}

/**
 * Queries a data store with a pattern to find all resulting bindings.
 * Before matching the pattern with the store,
 * the given binding is applied to the pattern first.
 *
 * The resulting binding includes the given binding.
 *
 * @param pattern - Pattern to match with the data store.
 * @param binding - Pattern to first apply to the given pattern.
 * @param data - Data store to query.
 */
export function getAppliedBindings(pattern: Quad, binding: SimpleBinding, data: Store): SimpleBinding[] {
  const result: SimpleBinding[] = [];
  const matches = data.getQuads(
    pattern.subject.termType === 'Variable' ? binding[pattern.subject.value] : pattern.subject,
    pattern.predicate.termType === 'Variable' ? binding[pattern.predicate.value] : pattern.predicate,
    pattern.object.termType === 'Variable' ? binding[pattern.object.value] : pattern.object,
    null,
  );
  for (const match of matches) {
    result.push({
      ...binding,
      ...matchBinding(pattern, match),
    });
  }
  return result;
}

/**
 * Finds the binding necessary to match the given pattern to the given quad.
 * This function assumes it has been verified that the pattern can match the quad.
 *
 * @param pattern - Pattern that can match the quad.
 * @param match - A quad that can be matched by the given pattern.
 */
export function matchBinding(pattern: Quad, match: Quad): SimpleBinding {
  const result: SimpleBinding = {};
  for (const pos of [ 'subject', 'predicate', 'object' ] as const) {
    if (pattern[pos].termType === 'Variable') {
      result[pattern[pos].value] = match[pos];
    }
  }
  return result;
}
