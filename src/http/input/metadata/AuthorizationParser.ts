import { DataFactory } from 'n3';
import type { NamedNode } from '@rdfjs/types';
import type { HttpRequest } from '../../../server/HttpRequest';
import { matchesAuthorizationScheme } from '../../../util/HeaderUtil';
import { SOLID_META } from '../../../util/Vocabularies';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataParser } from './MetadataParser';
import namedNode = DataFactory.namedNode;

/**
 * Parses specific authorization schemes and stores their value as metadata.
 * The keys of the input `authMap` should be the schemes,
 * and the values the corresponding predicate that should be used to store the value in the metadata.
 * The scheme will be sliced off the value, after which it is used as the object in the metadata triple.
 *
 * This should be used for custom authorization schemes,
 * for things like OIDC tokens a {@link CredentialsExtractor} should be used.
 */
export class AuthorizationParser extends MetadataParser {
  private readonly authMap: Record<string, NamedNode>;

  public constructor(authMap: Record<string, string>) {
    super();
    this.authMap = Object.fromEntries(
      Object.entries(authMap).map(([ scheme, uri ]): [string, NamedNode] => [ scheme, namedNode(uri) ]),
    );
  }

  public async handle(input: { request: HttpRequest; metadata: RepresentationMetadata }): Promise<void> {
    const authHeader = input.request.headers.authorization;
    if (!authHeader) {
      return;
    }
    for (const [ scheme, uri ] of Object.entries(this.authMap)) {
      if (matchesAuthorizationScheme(scheme, authHeader)) {
        // This metadata should not be stored
        input.metadata.add(uri, authHeader.slice(scheme.length + 1), SOLID_META.ResponseMetadata);
        // There can only be 1 match
        return;
      }
    }
  }
}
