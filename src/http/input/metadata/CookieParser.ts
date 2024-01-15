import { parse } from 'cookie';
import { DataFactory } from 'n3';
import type { NamedNode } from '@rdfjs/types';
import type { HttpRequest } from '../../../server/HttpRequest';
import { SOLID_META } from '../../../util/Vocabularies';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataParser } from './MetadataParser';
import namedNode = DataFactory.namedNode;

/**
 * Parses the cookie header and stores their values as metadata.
 * The keys of the input `cookieMap` should be the cookie names,
 * and the values the corresponding predicate that should be used to store the value in the metadata.
 * The values of the cookies will be used as objects in the generated triples
 */
export class CookieParser extends MetadataParser {
  private readonly cookieMap: Record<string, NamedNode>;

  public constructor(cookieMap: Record<string, string>) {
    super();
    this.cookieMap = Object.fromEntries(
      Object.entries(cookieMap).map(([ name, uri ]): [string, NamedNode] => [ name, namedNode(uri) ]),
    );
  }

  public async handle(input: { request: HttpRequest; metadata: RepresentationMetadata }): Promise<void> {
    const cookies = parse(input.request.headers.cookie ?? '');
    for (const [ name, uri ] of Object.entries(this.cookieMap)) {
      const value = cookies[name];
      if (value) {
        // This metadata should not be stored
        input.metadata.add(uri, value, SOLID_META.ResponseMetadata);
      }
    }
  }
}
