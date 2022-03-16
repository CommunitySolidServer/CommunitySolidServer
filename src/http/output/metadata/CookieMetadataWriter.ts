import { serialize } from 'cookie';
import type { NamedNode } from 'n3';
import { DataFactory } from 'n3';
import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

// TODO: documentation

/**
 * Generates the necessary `Set-Cookie` header if a cookie value is detected in the metadata.
 * The keys of the input `cookieMap` should be the URIs of the predicates
 * used in the metadata when the object is a cookie value.
 * The value of the map are the name that will be used for the cookie.
 */
export class CookieMetadataWriter extends MetadataWriter {
  private readonly cookieMap: Map<NamedNode, string>;

  public constructor(cookieMap: Record<string, string>) {
    super();
    this.cookieMap = new Map<NamedNode, string>(Object.entries(cookieMap)
      .map(([ uri, name ]): [ NamedNode, string ] => [ DataFactory.namedNode(uri), name ]));
  }

  // TODO: why are we not setting an expiration here?
  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const { response, metadata } = input;
    for (const [ uri, name ] of this.cookieMap.entries()) {
      const value = metadata.get(uri)?.value;
      if (value) {
        // Not setting secure flag since not all tools realize those cookies are also valid for http://localhost.
        // Not setting the httpOnly flag as that would prevent JS API access.
        // SameSite: Lax makes it so the cookie gets sent if the origin is the server,
        // or if the browser navigates there from another site.
        // Setting the path to `/` so it applies to the entire server.
        addHeader(response, 'Set-Cookie', serialize(name, value, { path: '/', sameSite: 'lax' }));
      }
    }
  }
}
