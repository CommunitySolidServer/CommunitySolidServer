import { DataFactory } from 'n3';
import type { Literal, NamedNode, Term } from 'rdf-js';
import { CONTENT_TYPE_TERM } from './Vocabularies';

const { namedNode, literal } = DataFactory;

// Shorthands for commonly used predicates
const shorthands: Record<string, NamedNode> = {
  contentType: CONTENT_TYPE_TERM,
};

// Caches named node conversions
const termMap: Record<string, NamedNode> = {};

/**
 * @param input - Checks if this is a {@link Term}.
 */
export const isTerm = (input?: any): input is Term => input?.termType;

/**
 * Converts the incoming name to a named node if needed.
 * In case of string, first checks if it is a shorthand, if not a new named node gets made.
 * The generated terms get cached to prevent the amount of named nodes that get created,
 * so only use this for internal constants!
 * @param name - Predicate to potentially transform.
 */
export const toCachedNamedNode = (name: NamedNode | string): NamedNode => {
  if (typeof name === 'string') {
    if (shorthands[name]) {
      return shorthands[name];
    }
    if (!termMap[name]) {
      termMap[name] = namedNode(name);
    }
    return termMap[name];
  }
  return name;
};

/**
 * Converts a subject to a named node when needed.
 * @param subject - Subject to potentially transform.
 */
export const toSubjectTerm = (subject: NamedNode | string): NamedNode =>
  typeof subject === 'string' ? namedNode(subject) : subject;

export const toPredicateTerm = toSubjectTerm;

/**
 * Converts an object term when needed.
 * @param object - Object to potentially transform.
 * @param preferLiteral - Whether strings are converted to literals or named nodes.
 */
export const toObjectTerm = <T extends Term>(object: T | string, preferLiteral = false): T => {
  if (typeof object === 'string') {
    return (preferLiteral ? literal(object) : namedNode(object)) as any;
  }
  return object;
};

/**
 * Creates a literal by first converting the dataType string to a named node.
 * @param object - Object value.
 * @param dataType - Object data type (as string).
 */
export const toLiteral = (object: string | number, dataType: NamedNode): Literal =>
  DataFactory.literal(object, toCachedNamedNode(dataType));
