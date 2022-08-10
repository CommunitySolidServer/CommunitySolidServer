/* eslint-disable function-paren-newline */
import { DataFactory } from 'n3';
import type { NamedNode } from 'rdf-js';

/**
 * A `Record` in which each value is a concatenation of the baseUrl and its key.
 */
type ExpandedRecord<TBase extends string, TLocal extends string> = {[K in TLocal]: `${TBase}${K}` };

/**
 * Has a base URL as `namespace` value and each key has as value the concatenation with that base URL.
 */
type ValueVocabulary<TBase extends string, TLocal extends string> =
  { namespace: TBase } & ExpandedRecord<TBase, TLocal>;
/**
 * A {@link ValueVocabulary} where the URI values are {@link NamedNode}s.
 */
type TermVocabulary<T> = T extends ValueVocabulary<any, any> ? {[K in keyof T]: NamedNode<T[K]> } : never;

/**
 * Contains a namespace and keys linking to the entries in this namespace.
 * The `terms` field contains the same values but as {@link NamedNode} instead of string.
 */
export type Vocabulary<TBase extends string, TKey extends string> =
  ValueVocabulary<TBase, TKey> & { terms: TermVocabulary<ValueVocabulary<TBase, TKey>> };

/**
 * A {@link Vocabulary} where all the non-namespace fields are of unknown value.
 * This is a fallback in case {@link createVocabulary} gets called with a non-strict string array.
 */
export type PartialVocabulary<TBase extends string> =
  { namespace: TBase } &
  Partial<Record<string, string>> &
  { terms: { namespace: NamedNode<TBase> } & Partial<Record<string, NamedNode>> };

/**
 * A local name of a {@link Vocabulary}.
 */
export type VocabularyLocal<T> = T extends Vocabulary<any, infer TKey> ? TKey : never;
/**
 * A URI string entry of a {@link Vocabulary}.
 */
export type VocabularyValue<T> = T extends Vocabulary<any, infer TKey> ? T[TKey] : never;
/**
 * A {@link NamedNode} entry of a {@link Vocabulary}.
 */
export type VocabularyTerm<T> = T extends Vocabulary<any, infer TKey> ? T['terms'][TKey] : never;

/**
 * Creates a function that expands local names from the given base URI,
 * and exports the given local names as properties on the returned object.
 */
function createValueVocabulary<TBase extends string, TLocal extends string>(baseUri: TBase, localNames: TLocal[]):
ValueVocabulary<TBase, TLocal> {
  const expanded: Partial<ExpandedRecord<TBase, TLocal>> = { };
  // Expose the listed local names as properties
  for (const localName of localNames) {
    expanded[localName] = `${baseUri}${localName}`;
  }
  return {
    namespace: baseUri,
    ...expanded as ExpandedRecord<TBase, TLocal>,
  };
}

/**
 * Creates a function that expands local names from the given base URI into named nodes,
 * and exports the given local names as properties on the returned object.
 */
function createTermVocabulary<TBase extends string, TLocal extends string>(namespace: ValueVocabulary<TBase, TLocal>):
TermVocabulary<ValueVocabulary<TBase, TLocal>> {
  // Need to cast since `fromEntries` typings aren't strict enough
  return Object.fromEntries(
    Object.entries(namespace).map(([ key, value ]): [string, NamedNode] => [ key, DataFactory.namedNode(value) ]),
  ) as TermVocabulary<ValueVocabulary<TBase, TLocal>>;
}

/**
 * Creates a function that expands local names from the given base URI into string,
 * and exports the given local names as properties on the returned object.
 * Under the `terms` property, it exposes the expanded local names as named nodes.
 */
export function createVocabulary<TBase extends string, TLocal extends string>(baseUri: TBase,
  ...localNames: TLocal[]): string extends TLocal ? PartialVocabulary<TBase> : Vocabulary<TBase, TLocal> {
  const namespace = createValueVocabulary(baseUri, localNames);
  return {
    ...namespace,
    terms: createTermVocabulary(namespace),
  };
}

export const ACL = createVocabulary('http://www.w3.org/ns/auth/acl#',
  'accessTo',
  'agent',
  'agentClass',
  'agentGroup',
  'AuthenticatedAgent',
  'Authorization',
  'default',
  'mode',

  'Write',
  'Read',
  'Append',
  'Control',
);

export const AS = createVocabulary('https://www.w3.org/ns/activitystreams#',
  'Create',
  'Delete',
  'Update',
);

export const AUTH = createVocabulary('urn:solid:auth:',
  'userMode',
  'publicMode',
);

export const DC = createVocabulary('http://purl.org/dc/terms/',
  'description',
  'modified',
  'title',
);

export const FOAF = createVocabulary('http://xmlns.com/foaf/0.1/',
  'Agent',
);

export const HH = createVocabulary('http://www.w3.org/2011/http-headers#',
  'content-length',
);

export const HTTP = createVocabulary('http://www.w3.org/2011/http#',
  'statusCodeNumber',
);

export const IANA = createVocabulary('http://www.w3.org/ns/iana/media-types/');

export const JSON_LD = createVocabulary('http://www.w3.org/ns/json-ld#',
  'context',
);

export const LDP = createVocabulary('http://www.w3.org/ns/ldp#',
  'contains',

  'BasicContainer',
  'Container',
  'Resource',
);

export const MA = createVocabulary('http://www.w3.org/ns/ma-ont#',
  'format',
);

export const OIDC = createVocabulary('http://www.w3.org/ns/solid/oidc#',
  'redirect_uris',
);

export const PIM = createVocabulary('http://www.w3.org/ns/pim/space#',
  'Storage',
);

export const POSIX = createVocabulary('http://www.w3.org/ns/posix/stat#',
  'mtime',
  'size',
);

export const RDF = createVocabulary('http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'type',
);

export const RDFS = createVocabulary('http://www.w3.org/2000/01/rdf-schema#',
  'label',
);

export const SOLID = createVocabulary('http://www.w3.org/ns/solid/terms#',
  'deletes',
  'inserts',
  'oidcIssuer',
  'oidcIssuerRegistrationToken',
  'oidcRegistration',
  'where',

  'InsertDeletePatch',
);

export const SOLID_AS = createVocabulary('http://www.w3.org/ns/solid/activitystreams#',
  'Activity',
);

export const SOLID_ERROR = createVocabulary('urn:npm:solid:community-server:error:',
  'disallowedMethod',
  'errorResponse',
  'stack',
);

export const SOLID_HTTP = createVocabulary('urn:npm:solid:community-server:http:',
  'location',
  'slug',
);

export const SOLID_META = createVocabulary('urn:npm:solid:community-server:meta:',
  // This identifier is used as graph for all metadata that is generated on the fly and should not be stored
  'ResponseMetadata',
  // This is used to identify templates that can be used for the representation of a resource
  'template',
  // This is used to store Content-Type Parameters
  'contentTypeParameter',
  'value',
  // This is used to indicate whether metadata should be preserved or not during a PUT operation
  'preserve',
);

export const VANN = createVocabulary('http://purl.org/vocab/vann/',
  'preferredNamespacePrefix',
);

export const VCARD = createVocabulary('http://www.w3.org/2006/vcard/ns#',
  'hasMember',
);

export const XSD = createVocabulary('http://www.w3.org/2001/XMLSchema#',
  'dateTime',
  'integer',
);

// Alias for commonly used types
export const CONTENT_LENGTH = HH['content-length'];
export const CONTENT_LENGTH_TERM = HH.terms['content-length'];
export const CONTENT_TYPE = MA.format;
export const CONTENT_TYPE_TERM = MA.terms.format;
export const PREFERRED_PREFIX = VANN.preferredNamespacePrefix;
export const PREFERRED_PREFIX_TERM = VANN.terms.preferredNamespacePrefix;
