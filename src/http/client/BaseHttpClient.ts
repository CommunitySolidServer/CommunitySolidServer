import type { RequestOptions, IncomingMessage } from 'http';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { URL } from 'url';
import type { HttpClient } from './HttpClient';

export class BaseHttpClient implements HttpClient {
  public async call(url: string | URL, options: RequestOptions, data: any): Promise<IncomingMessage> {
    const parsedUrl = url instanceof URL ? url : new URL(url);
    const { protocol } = parsedUrl;
    if (!protocol.startsWith('http')) {
      throw new Error(`Protocol ${protocol} not supported.`);
    }
    const client = protocol === 'https:' ? httpsRequest : httpRequest;
    const request = client(parsedUrl, options);

    return new Promise((resolve, reject): void => {
      request.on('error', (error): void => {
        reject(new Error(`Fetch error: ${error.message}`));
      });
      request.on('response', (response): void => {
        resolve(response);
      });
      request.write(data);
      request.end();
    });
  }
}
