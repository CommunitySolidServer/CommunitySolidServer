const createSuffixFn = (prefix: string): any => (suffix: string): string => `${prefix}${suffix}`;

const ACL_PREFIX = createSuffixFn('http://www.w3.org/ns/auth/acl#');
export const ACL = {
  accessTo: ACL_PREFIX('accessTo'),
  agent: ACL_PREFIX('agent'),
  agentClass: ACL_PREFIX('agentClass'),
  default: ACL_PREFIX('default'),
  mode: ACL_PREFIX('mode'),

  Write: ACL_PREFIX('Write'),
  Read: ACL_PREFIX('Read'),
  Append: ACL_PREFIX('Append'),
  Control: ACL_PREFIX('Control'),
};

const DCTERMS_PREFIX = createSuffixFn('http://purl.org/dc/terms/');
export const DCTERMS = {
  modified: DCTERMS_PREFIX('modified'),
};

const FOAF_PREFIX = createSuffixFn('http://xmlns.com/foaf/0.1/');
export const FOAF = {
  Agent: FOAF_PREFIX('Agent'),
  AuthenticatedAgent: FOAF_PREFIX('AuthenticatedAgent'),
};

const HTTP_PREFIX = createSuffixFn('urn:solid:http:');
export const HTTP = {
  slug: HTTP_PREFIX('slug'),
};

const LDP_PREFIX = createSuffixFn('http://www.w3.org/ns/ldp#');
export const LDP = {
  contains: LDP_PREFIX('contains'),

  BasicContainer: LDP_PREFIX('BasicContainer'),
  Container: LDP_PREFIX('Container'),
  Resource: LDP_PREFIX('Resource'),
};

const MA_PREFIX = createSuffixFn('http://www.w3.org/ns/ma-ont#');
export const MA = {
  format: MA_PREFIX('format'),
};

const POSIX_PREFIX = createSuffixFn('http://www.w3.org/ns/posix/stat#');
export const POSIX = {
  mtime: POSIX_PREFIX('mtime'),
  size: POSIX_PREFIX('size'),
};

const RDF_PREFIX = createSuffixFn('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
export const RDF = {
  type: RDF_PREFIX('type'),
};

const XSD_PREFIX = createSuffixFn('http://www.w3.org/2001/XMLSchema#');
export const XSD = {
  dateTime: XSD_PREFIX('dateTime'),
  integer: XSD_PREFIX('integer'),
};

// Alias for most commonly used URI
export const CONTENT_TYPE = MA.format;
