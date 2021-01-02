import { DataFactory } from 'n3';
import type { Literal, NamedNode, Term } from 'rdf-js';
import { CONTENT_TYPE } from './UriConstants';

// Shorthands for commonly used predicates
const shorthands: Record<string, NamedNode> = {
  contentType: DataFactory.namedNode(CONTENT_TYPE),
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
      termMap[name] = DataFactory.namedNode(name);
    }
    return termMap[name];
  }
  return name;
};

/**
 * Converts an object to a literal when needed.
 * @param object - Object to potentially transform.
 */
export const toObjectTerm = (object: NamedNode | Literal | string): NamedNode | Literal =>
  typeof object === 'string' ? DataFactory.literal(object) : object;

/**
 * Creates a literal by first converting the dataType string to a named node.
 * @param object - Object value.
 * @param dataType - Object data type (as string).
 */
export const toLiteral = (object: string | number, dataType: string): Literal =>
  DataFactory.literal(object, toCachedNamedNode(dataType));
