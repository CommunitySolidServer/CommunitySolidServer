import type { IncomingMessage } from 'http';
import type { Guarded } from '../util/GuardedStream';

/**
 * An incoming HTTP request;
 */
export type HttpRequest = Guarded<IncomingMessage>;

/**
 * Checks if the given stream is an HttpRequest.
 */
export function isHttpRequest(stream: any): stream is HttpRequest {
  return typeof stream.socket === 'object' && typeof stream.url === 'string' && typeof stream.method === 'string';
}
