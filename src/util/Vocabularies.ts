/* eslint-disable @typescript-eslint/naming-convention, function-paren-newline */
import { namedNode } from '@rdfjs/data-model';
import type { NamedNode } from 'rdf-js';

type PrefixResolver<T> = (localName?: string) => T;
type RecordOf<TKey extends any[], TValue> = Record<TKey[number], TValue>;

export type Namespace<TKey extends any[], TValue> =
  PrefixResolver<TValue> & RecordOf<TKey, TValue>;

/**
 * Creates a function that expands local names from the given base URI,
 * and exports the given local names as properties on the returned object.
 */
export function createNamespace<TKey extends string, TValue>(
  baseUri: string,
  toValue: (expanded: string) => TValue,
  ...localNames: TKey[]):
  Namespace<typeof localNames, TValue> {
  // Create a function that expands local names
  const expanded = {} as Record<string, TValue>;
  const namespace = ((localName = ''): TValue => {
    if (!(localName in expanded)) {
      expanded[localName] = toValue(`${baseUri}${localName}`);
    }
    return expanded[localName];
  }) as Namespace<typeof localNames, TValue>;

  // Expose the listed local names as properties
  for (const localName of localNames) {
    (namespace as RecordOf<typeof localNames, TValue>)[localName] = namespace(localName);
  }
  return namespace;
}

/**
 * Creates a function that expands local names from the given base URI into strings,
 * and exports the given local names as properties on the returned object.
 */
export function createUriNamespace<T extends string>(baseUri: string, ...localNames: T[]):
Namespace<typeof localNames, string> {
  return createNamespace(baseUri, (expanded): string => expanded, ...localNames);
}

/**
 * Creates a function that expands local names from the given base URI into named nodes,
 * and exports the given local names as properties on the returned object.
 */
export function createTermNamespace<T extends string>(baseUri: string, ...localNames: T[]):
Namespace<typeof localNames, NamedNode> {
  return createNamespace(baseUri, namedNode, ...localNames);
}

/**
 * Creates a function that expands local names from the given base URI into string,
 * and exports the given local names as properties on the returned object.
 * Under the `terms` property, it exposes the expanded local names as named nodes.
 */
export function createUriAndTermNamespace<T extends string>(baseUri: string, ...localNames: T[]):
Namespace<typeof localNames, string> & { terms: Namespace<typeof localNames, NamedNode> } {
  return Object.assign(createUriNamespace(baseUri, ...localNames),
    { terms: createTermNamespace(baseUri, ...localNames) });
}

export const ACL = createUriAndTermNamespace('http://www.w3.org/ns/auth/acl#',
  'accessTo',
  'agent',
  'agentClass',
  'default',
  'mode',

  'Write',
  'Read',
  'Append',
  'Control',
);

export const DC = createUriAndTermNamespace('http://purl.org/dc/terms/',
  'modified',
);

export const FOAF = createUriAndTermNamespace('http://xmlns.com/foaf/0.1/',
  'Agent',
  'AuthenticatedAgent',
);

export const HTTP = createUriAndTermNamespace('urn:solid:http:',
  'location',
  'slug',
);

export const LDP = createUriAndTermNamespace('http://www.w3.org/ns/ldp#',
  'contains',

  'BasicContainer',
  'Container',
  'Resource',
);

export const MA = createUriAndTermNamespace('http://www.w3.org/ns/ma-ont#',
  'format',
);

export const PIM = createUriAndTermNamespace('http://www.w3.org/ns/pim/space#',
  'Storage',
);

export const POSIX = createUriAndTermNamespace('http://www.w3.org/ns/posix/stat#',
  'mtime',
  'size',
);

export const RDF = createUriAndTermNamespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'type',
);

export const VANN = createUriAndTermNamespace('http://purl.org/vocab/vann/',
  'preferredNamespacePrefix',
);

export const XSD = createUriAndTermNamespace('http://www.w3.org/2001/XMLSchema#',
  'dateTime',
  'integer',
);

// Alias for commonly used types
export const CONTENT_TYPE = MA.format;
export const CONTENT_TYPE_TERM = MA.terms.format;
export const PREFERRED_PREFIX = VANN.preferredNamespacePrefix;
export const PREFERRED_PREFIX_TERM = VANN.terms.preferredNamespacePrefix;
