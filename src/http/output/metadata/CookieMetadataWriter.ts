import { serialize } from 'cookie';
import type { NamedNode } from 'n3';
import { DataFactory } from 'n3';
import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

/**
 * Generates the necessary `Set-Cookie` header if a cookie value is detected in the metadata.
 * The keys of the input `cookieMap` should be the URIs of the predicates
 * used in the metadata when the object is a cookie value.
 * The value of the map are objects that contain the name of the cookie,
 * and the URI that is used to store the expiration date in the metadata, if any.
 * If no expiration date is found in the metadata, none will be set for the cookie,
 * causing it to be a session cookie.
 */
export class CookieMetadataWriter extends MetadataWriter {
  private readonly cookieMap: Map<NamedNode, { name: string; expirationUri?: NamedNode }>;

  public constructor(cookieMap: Record<string, { name: string; expirationUri?: string }>) {
    super();
    this.cookieMap = new Map<NamedNode, { name: string; expirationUri?: NamedNode }>(Object.entries(cookieMap)
      .map(([ uri, { name, expirationUri }]): [ NamedNode, { name: string; expirationUri?: NamedNode } ] =>
        [
          DataFactory.namedNode(uri),
          {
            name,
            expirationUri: expirationUri ? DataFactory.namedNode(expirationUri) : undefined,
          },
        ]));
  }

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const { response, metadata } = input;
    for (const [ uri, { name, expirationUri }] of this.cookieMap.entries()) {
      const value = metadata.get(uri)?.value;
      if (value) {
        const expiration = expirationUri && metadata.get(expirationUri)?.value;
        const expires = typeof expiration === 'string' ? new Date(expiration) : undefined;
        // Not setting secure flag since not all tools realize those cookies are also valid for http://localhost.
        // Not setting the httpOnly flag as that would prevent JS API access.
        // SameSite: Lax makes it so the cookie gets sent if the origin is the server,
        // or if the browser navigates there from another site.
        // Setting the path to `/` so it applies to the entire server.
        addHeader(response, 'Set-Cookie', serialize(name, value, { path: '/', sameSite: 'lax', expires }));
      }
    }
  }
}
