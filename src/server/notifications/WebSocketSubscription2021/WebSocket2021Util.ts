import type { IncomingMessage } from 'http';

/**
 * Generates a WebSocket URL by converting an HTTP(S) URL into a WS(S) URL
 * and adding the `auth` query parameter using the identifier.
 * @param url - The HTTP(S) URL.
 * @param id - The identifier to use as `auth` parameter.
 */
export function generateWebSocketUrl(url: string, id: string): string {
  return `ws${url.slice('http'.length)}?auth=${encodeURIComponent(id)}`;
}

/**
 * Parses a {@link IncomingMessage} to extract both its path and the identifier used for authentication.
 * The returned path is relative to the host.
 *
 * E.g., a request to `ws://example.com/foo/bar?auth=123456` would return `{ path: '/foo/bar', id: '123456' }`.
 *
 * @param request - The request to parse.
 */
export function parseWebSocketRequest(request: IncomingMessage): { path: string; id?: string } {
  // Base doesn't matter since we just want the path and query parameter
  const { pathname, searchParams } = new URL(request.url ?? '', 'http://example.com');

  let auth: string | undefined;
  if (searchParams.has('auth')) {
    auth = decodeURIComponent(searchParams.get('auth')!);
  }

  return {
    path: pathname,
    id: auth,
  };
}
