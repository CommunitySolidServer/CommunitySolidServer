import { createVocabulary } from 'rdf-vocabulary';

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
