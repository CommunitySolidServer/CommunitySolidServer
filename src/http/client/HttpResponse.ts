import type { IncomingMessage } from 'http';
import type { Guarded } from '../../util/GuardedStream';

/**
 * An incoming HTTP request;
 */
export type HttpResponse = Guarded<IncomingMessage>;

/**
 * Checks if the given stream is an HttpResponse.
 */
export function isHttpResponse(stream: any): stream is HttpResponse {
  return typeof stream.socket === 'object' && typeof stream.url === 'string' && typeof stream.method === 'string';
}
