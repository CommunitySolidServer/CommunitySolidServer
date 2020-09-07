import { namedNode } from '@rdfjs/data-model';
import { NamedNode } from 'rdf-js';

export const TYPE: NamedNode = namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
export const CONTENT_TYPE: NamedNode = namedNode('http://www.w3.org/ns/ma-ont#format');
export const SLUG: NamedNode = namedNode('http://example.com/slug');
export const LAST_CHANGED: NamedNode = namedNode('http://example.com/lastChanged');
export const BYTE_SIZE: NamedNode = namedNode('http://example.com/byteSize');
export const ACL_RESOURCE: NamedNode = namedNode('http://example.com/acl');
