import { DataFactory } from 'n3';
import type { NamedNode, Literal, Term } from 'rdf-js';
import { CONTENT_TYPE_TERM } from './Vocabularies';

const { namedNode, literal } = DataFactory;

// Shorthands for commonly used predicates
const shorthands: Record<string, NamedNode> = {
  contentType: CONTENT_TYPE_TERM,
};

// Caches named node conversions
const cachedNamedNodes: Record<string, NamedNode> = {
  ...shorthands,
};

/**
 * Converts the incoming name (URI or shorthand) to a named node.
 * The generated terms get cached to reduce the number of created nodes,
 * so only use this for internal constants!
 * @param name - Predicate to potentially transform.
 */
export function toCachedNamedNode(name: NamedNode | string): NamedNode {
  if (typeof name !== 'string') {
    return name;
  }
  if (!(name in cachedNamedNodes)) {
    cachedNamedNodes[name] = namedNode(name);
  }
  return cachedNamedNodes[name];
}

/**
 * @param input - Checks if this is a {@link Term}.
 */
export function isTerm(input?: any): input is Term {
  return input && typeof input.termType === 'string';
}

/**
 * Converts a string to a named node when needed.
 * @param subject - Subject to potentially transform.
 */
export function toNamedTerm(subject: string): NamedNode;
export function toNamedTerm<T extends Term>(subject: T): T;
export function toNamedTerm<T extends Term>(subject: T | string): T | NamedNode;
export function toNamedTerm(subject: Term | string): Term {
  return typeof subject === 'string' ? namedNode(subject) : subject;
}

export const toPredicateTerm = toNamedTerm;

/**
 * Converts an object term when needed.
 * @param object - Object to potentially transform.
 * @param preferLiteral - Whether strings are converted to literals or named nodes.
 */
export function toObjectTerm(object: string, preferLiteral?: boolean): NamedNode;
export function toObjectTerm<T extends Term>(object: T, preferLiteral?: boolean): T;
export function toObjectTerm<T extends Term>(object: T | string, preferLiteral?: boolean): T | NamedNode;
export function toObjectTerm(object: Term | string, preferLiteral = false): Term {
  if (typeof object === 'string') {
    return (preferLiteral ? literal(object) : namedNode(object)) as any;
  }
  return object;
}

/**
 * Creates a literal by first converting the dataType string to a named node.
 * @param object - Object value.
 * @param dataType - Object data type (as string).
 */
export function toLiteral(object: string | number, dataType: NamedNode): Literal {
  return literal(`${object}`, dataType);
}
