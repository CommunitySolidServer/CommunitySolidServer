// Well-known content types
export const APPLICATION_JSON = 'application/json';
export const APPLICATION_LD_JSON = 'application/ld+json';
export const APPLICATION_OCTET_STREAM = 'application/octet-stream';
export const APPLICATION_SPARQL_UPDATE = 'application/sparql-update';
export const APPLICATION_X_WWW_FORM_URLENCODED = 'application/x-www-form-urlencoded';
export const TEXT_HTML = 'text/html';
export const TEXT_MARKDOWN = 'text/markdown';
export const TEXT_N3 = 'text/n3';
export const TEXT_TURTLE = 'text/turtle';

// Internal content types (not exposed over HTTP)
export const INTERNAL_ALL = 'internal/*';
export const INTERNAL_QUADS = 'internal/quads';
export const INTERNAL_ERROR = 'internal/error';

export const DEFAULT_CUSTOM_TYPES = {
  acl: TEXT_TURTLE,
  acr: TEXT_TURTLE,
  meta: TEXT_TURTLE,
};
