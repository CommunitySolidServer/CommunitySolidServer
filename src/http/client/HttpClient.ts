import type { IncomingMessage, RequestOptions } from 'http';
import type { URL } from 'url';

/**
 * An HTTP client
 */
export interface HttpClient {
  call: (url: string | URL,
    options: RequestOptions, data: any, callback?: (res: IncomingMessage) => void) => void;
}
