import { literal, namedNode } from '@rdfjs/data-model';
import type { Literal, NamedNode, Term } from 'rdf-js';
import { MA_CONTENT_TYPE } from '../../util/MetadataTypes';

// Shorthands for commonly used predicates
const shorthands: { [id: string]: NamedNode } = {
  contentType: namedNode(MA_CONTENT_TYPE),
};

// Caches named node conversions
const termMap: { [id: string]: NamedNode } = {};

/**
 * @param input - Checks if this is a {@link Term}.
 */
export const isTerm = (input?: any): input is Term => input?.termType;

/**
 * Converts the incoming predicate to a named node.
 * In case of string, first checks if it is a shorthand, if not a new named node gets made.
 * @param predicate - Predicate to potentially transform.
 */
export const getPredicateTerm = (predicate: NamedNode | string): NamedNode => {
  if (typeof predicate === 'string') {
    if (shorthands[predicate]) {
      return shorthands[predicate];
    }
    if (!termMap[predicate]) {
      termMap[predicate] = namedNode(predicate);
    }
    return termMap[predicate];
  }
  return predicate;
};

/**
 * Converts an object to a literal when needed.
 * @param object - Object to potentially transform.
 */
export const getObjectTerm = (object: NamedNode | Literal | string): NamedNode | Literal =>
  typeof object === 'string' ? literal(object) : object;
