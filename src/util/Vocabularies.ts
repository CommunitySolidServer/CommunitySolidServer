/* eslint-disable function-paren-newline */
import { namedNode } from '@rdfjs/data-model';
import type { NamedNode } from 'rdf-js';

type RecordOf<TKey extends any[], TValue> = Record<TKey[number], TValue>;

export type Namespace<TKey extends any[], TValue> =
  { namespace: TValue } & RecordOf<TKey, TValue>;

/**
 * Creates a function that expands local names from the given base URI,
 * and exports the given local names as properties on the returned object.
 */
export function createNamespace<TKey extends string, TValue>(
  baseUri: string,
  toValue: (expanded: string) => TValue,
  ...localNames: TKey[]):
  Namespace<typeof localNames, TValue> {
  const expanded: Namespace<typeof localNames, TValue> = {} as any;
  // Expose the main namespace
  expanded.namespace = toValue(baseUri);
  // Expose the listed local names as properties
  for (const localName of localNames) {
    (expanded as RecordOf<TKey[], TValue>)[localName] = toValue(`${baseUri}${localName}`);
  }
  return expanded;
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
  'AuthenticatedAgent',
  'default',
  'mode',

  'Write',
  'Read',
  'Append',
  'Control',
);

export const AUTH = createUriAndTermNamespace('urn:solid:auth:',
  'userMode',
  'publicMode',
);

export const DC = createUriAndTermNamespace('http://purl.org/dc/terms/',
  'description',
  'modified',
  'title',
);

export const FOAF = createUriAndTermNamespace('http://xmlns.com/foaf/0.1/',
  'Agent',
);

export const HTTP = createUriAndTermNamespace('http://www.w3.org/2011/http#',
  'statusCodeNumber',
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

export const OIDC = createUriAndTermNamespace('http://www.w3.org/ns/solid/oidc#',
  'redirect_uris',
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

export const SOLID = createUriAndTermNamespace('http://www.w3.org/ns/solid/terms#',
  'oidcIssuer',
  'oidcIssuerRegistrationToken',
  'oidcRegistration',
);

export const SOLID_ERROR = createUriAndTermNamespace('urn:npm:solid:community-server:error:',
  'stack',
);

export const SOLID_HTTP = createUriAndTermNamespace('urn:npm:solid:community-server:http:',
  'location',
  'slug',
);

export const SOLID_META = createUriAndTermNamespace('urn:npm:solid:community-server:meta:',
  // This identifier is used as graph for all metadata that is generated on the fly and should not be stored
  'ResponseMetadata',
);

export const VANN = createUriAndTermNamespace('http://purl.org/vocab/vann/',
  'preferredNamespacePrefix',
);

export const XSD = createUriAndTermNamespace('http://www.w3.org/2001/XMLSchema#',
  'dateTime',
  'integer',
);

export const HH = createUriAndTermNamespace('http://www.w3.org/2011/http-headers#',
  'content-length',
);

// Alias for commonly used types
export const CONTENT_TYPE = MA.format;
export const CONTENT_TYPE_TERM = MA.terms.format;
export const CONTENT_LENGTH_TERM = HH.terms['content-length'];
export const PREFERRED_PREFIX = VANN.preferredNamespacePrefix;
export const PREFERRED_PREFIX_TERM = VANN.terms.preferredNamespacePrefix;
