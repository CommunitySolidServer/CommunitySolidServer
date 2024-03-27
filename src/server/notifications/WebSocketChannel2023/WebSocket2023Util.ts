import type { IncomingMessage } from 'node:http';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';

/**
 * Generates a WebSocket URL by converting an HTTP(S) URL into a WS(S) URL.
 *
 * @param id - The identifier of the channel. Needs to be a URL.
 */
export function generateWebSocketUrl(id: string): string {
  return `ws${id.slice('http'.length)}`;
}

/**
 * Parses a {@link IncomingMessage} to extract its path used for authentication.
 *
 * @param baseUrl - The base URL of the server.
 * @param request - The request to parse.
 */
export function parseWebSocketRequest(baseUrl: string, request: IncomingMessage): string {
  const path = request.url;

  if (!path) {
    throw new BadRequestHttpError('Missing url parameter in WebSocket request');
  }

  // Use dummy base and then explicitly set the host and protocol from the base URL.
  const id = new URL(path, 'http://example.com');
  const base = new URL(baseUrl);
  id.host = base.host;
  id.protocol = base.protocol;

  return id.href;
}
