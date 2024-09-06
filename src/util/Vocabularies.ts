import { DataFactory } from 'n3';
import type { NamedNode } from '@rdfjs/types';

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
type TermVocabulary<T> = T extends ValueVocabulary<string, string> ? {[K in keyof T]: NamedNode<T[K]> } : never;

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
export type VocabularyLocal<T> = T extends Vocabulary<string, infer TKey> ? TKey : never;
/**
 * A URI string entry of a {@link Vocabulary}.
 */
export type VocabularyValue<T> = T extends Vocabulary<string, infer TKey> ? T[TKey] : never;
/**
 * A {@link NamedNode} entry of a {@link Vocabulary}.
 */
export type VocabularyTerm<T> = T extends Vocabulary<string, infer TKey> ? T['terms'][TKey] : never;

/**
 * Creates a {@link ValueVocabulary} with the given `baseUri` as namespace and all `localNames` as entries.
 */
function createValueVocabulary<TBase extends string, TLocal extends string>(baseUri: TBase, localNames: TLocal[]):
ValueVocabulary<TBase, TLocal> {
  const expanded: Partial<ExpandedRecord<TBase, TLocal>> = {};
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
 * Creates a {@link TermVocabulary} based on the provided {@link ValueVocabulary}.
 */
function createTermVocabulary<TBase extends string, TLocal extends string>(values: ValueVocabulary<TBase, TLocal>):
TermVocabulary<ValueVocabulary<TBase, TLocal>> {
  // Need to cast since `fromEntries` typings aren't strict enough
  return Object.fromEntries(
    Object.entries(values).map(([ key, value ]): [string, NamedNode] => [ key, DataFactory.namedNode(value) ]),
  ) as TermVocabulary<ValueVocabulary<TBase, TLocal>>;
}

/**
 * Creates a {@link Vocabulary} with the given `baseUri` as namespace and all `localNames` as entries.
 * The values are the local names expanded from the given base URI as strings.
 * The `terms` field contains all the same values but as {@link NamedNode} instead.
 */
export function createVocabulary<TBase extends string, TLocal extends string>(baseUri: TBase, ...localNames: TLocal[]):
string extends TLocal ? PartialVocabulary<TBase> : Vocabulary<TBase, TLocal> {
  const values = createValueVocabulary(baseUri, localNames);
  return {
    ...values,
    terms: createTermVocabulary(values),
  };
}

/**
 * Creates a new {@link Vocabulary} that extends an existing one by adding new local names.
 *
 * @param vocabulary - The {@link Vocabulary} to extend.
 * @param newNames - The new local names that need to be added.
 */
export function extendVocabulary<TBase extends string, TLocal extends string, TNew extends string>(
  vocabulary: Vocabulary<TBase, TLocal>,
  ...newNames: TNew[]
):
  ReturnType<typeof createVocabulary<TBase, TLocal | TNew>> {
  const localNames = Object.keys(vocabulary)
    .filter((key): boolean => key !== 'terms' && key !== 'namespace') as TLocal[];
  const allNames = [ ...localNames, ...newNames ];
  return createVocabulary(vocabulary.namespace, ...allNames);
}

export const ACL = createVocabulary(
  'http://www.w3.org/ns/auth/acl#',
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

export const ACP = createVocabulary(
  'http://www.w3.org/ns/solid/acp#',

  // Used for ACP middleware headers
  'AccessControlResource',
  'grant',
  'attribute',

  // Access Control Resource
  'resource',
  'accessControl',
  'memberAccessControl',

  // Access Control,
  'apply',

  // Policy
  'allow',
  'deny',
  'allOf',
  'anyOf',
  'noneOf',

  // Matcher
  'agent',
  'client',
  'issuer',
  'vc',
);

export const AS = createVocabulary(
  'https://www.w3.org/ns/activitystreams#',
  'object',
  'target',

  'Add',
  'Create',
  'Delete',
  'Remove',
  'Update',
);

export const AUTH = createVocabulary(
  'urn:solid:auth:',
  'userMode',
  'publicMode',
);

export const DC = createVocabulary(
  'http://purl.org/dc/terms/',
  'description',
  'modified',
  'title',
);

export const FOAF = createVocabulary(
  'http://xmlns.com/foaf/0.1/',
  'Agent',
);

export const HH = createVocabulary(
  'http://www.w3.org/2011/http-headers#',
  'content-length',
  'etag',
);

export const HTTP = createVocabulary(
  'http://www.w3.org/2011/http#',
  'statusCodeNumber',
);

export const IANA = createVocabulary(
  'http://www.w3.org/ns/iana/media-types/',
);

export const JSON_LD = createVocabulary(
  'http://www.w3.org/ns/json-ld#',
  'context',
);

export const LDP = createVocabulary(
  'http://www.w3.org/ns/ldp#',
  'contains',

  'BasicContainer',
  'Container',
  'Resource',
);

export const MA = createVocabulary(
  'http://www.w3.org/ns/ma-ont#',
  'format',
);

export const NOTIFY = createVocabulary(
  'http://www.w3.org/ns/solid/notifications#',
  'accept',
  'channelType',
  'endAt',
  'feature',
  'rate',
  'receiveFrom',
  'startAt',
  'state',
  'sender',
  'sendTo',
  'subscription',
  'topic',
  'webhookAuth',

  'WebhookChannel2023',
  'WebSocketChannel2023',
  'StreamingHTTPChannel2023',
);

export const OIDC = createVocabulary(
  'http://www.w3.org/ns/solid/oidc#',
  'redirect_uris',
);

export const PIM = createVocabulary(
  'http://www.w3.org/ns/pim/space#',
  'Storage',
);

export const POSIX = createVocabulary(
  'http://www.w3.org/ns/posix/stat#',
  'mtime',
  'size',
);

export const RDF = createVocabulary(
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'type',
);

export const RDFS = createVocabulary(
  'http://www.w3.org/2000/01/rdf-schema#',
  'label',
);

export const SOLID = createVocabulary(
  'http://www.w3.org/ns/solid/terms#',
  'deletes',
  'inserts',
  'oidcIssuer',
  'oidcIssuerRegistrationToken',
  'oidcRegistration',
  'storageDescription',
  'where',

  'InsertDeletePatch',
);

export const SOLID_AS = createVocabulary(
  'urn:npm:solid:community-server:activity:',
  'activity',
);

export const SOLID_ERROR = createVocabulary(
  'urn:npm:solid:community-server:error:',
  'disallowedMethod',
  'errorCode',
  'errorResponse',
  'stack',
  'target',
);

// Used to pass parameters to error templates
export const SOLID_ERROR_TERM = createVocabulary(
  'urn:npm:solid:community-server:error-term:',
  // Identifier of the resource responsible for the error
  'path',
);

export const SOLID_HTTP = createVocabulary(
  'urn:npm:solid:community-server:http:',
  'accountCookie',
  // When the above cookie expires, expects an ISO date string
  'accountCookieExpiration',
  // Unit, start, and end are used for range headers
  'end',
  'location',
  'start',
  'slug',
  'unit',
);

export const SOLID_META = createVocabulary(
  'urn:npm:solid:community-server:meta:',
  // This identifier is used as graph for all metadata that is generated on the fly and should not be stored
  'ResponseMetadata',
  // This is used to identify templates that can be used for the representation of a resource
  'template',
  // This is used to store Content-Type Parameters
  'contentTypeParameter',
  'value',
  // This is used to indicate whether metadata should be preserved or not during a PUT operation
  'preserve',
  // These predicates are used to describe the requested access in case of an unauthorized request
  'requestedAccess',
  'accessTarget',
  'accessMode',
);

export const VANN = createVocabulary(
  'http://purl.org/vocab/vann/',
  'preferredNamespacePrefix',
);

export const VCARD = createVocabulary(
  'http://www.w3.org/2006/vcard/ns#',
  'hasMember',
);

export const XSD = createVocabulary(
  'http://www.w3.org/2001/XMLSchema#',
  'dateTime',
  'duration',
  'integer',
  'string',
);

// Alias for commonly used types
export const CONTENT_LENGTH = HH['content-length'];
export const CONTENT_LENGTH_TERM = HH.terms['content-length'];
export const CONTENT_TYPE = MA.format;
export const CONTENT_TYPE_TERM = MA.terms.format;
export const PREFERRED_PREFIX = VANN.preferredNamespacePrefix;
export const PREFERRED_PREFIX_TERM = VANN.terms.preferredNamespacePrefix;
