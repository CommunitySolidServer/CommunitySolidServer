import type { RequestOptions, IncomingMessage } from 'http';
import { request } from 'http';
import type { URL } from 'url';
import type { HttpClient } from './HttpClient';

export class BaseHttpClient implements HttpClient {
  public call(target: string | URL,
    options: RequestOptions,
    data: any,
    callback?: ((res: IncomingMessage) => void) | undefined): void {
    const req = request(target, options, callback);
    req.write(data);
    req.end();
  }
}
