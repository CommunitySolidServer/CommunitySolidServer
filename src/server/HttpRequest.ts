import type { IncomingMessage } from 'node:http';
import type { Guarded } from '../util/GuardedStream';

/**
 * An incoming HTTP request;
 */
export type HttpRequest = Guarded<IncomingMessage>;

/**
 * Checks if the given stream is an HttpRequest.
 */
export function isHttpRequest(stream: unknown): stream is HttpRequest {
  const req = stream as HttpRequest;
  return typeof req.socket === 'object' && typeof req.url === 'string' && typeof req.method === 'string';
}
