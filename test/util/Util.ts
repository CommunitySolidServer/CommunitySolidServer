import { EventEmitter } from 'events';
import type { IncomingHttpHeaders } from 'http';
import type { MockResponse } from 'node-mocks-http';
import { createResponse } from 'node-mocks-http';
import streamifyArray from 'streamify-array';
import type { HttpHandler } from '../../src/server/HttpHandler';
import type { HttpRequest } from '../../src/server/HttpRequest';

export const call = async(
  handler: HttpHandler,
  requestUrl: URL,
  method: string,
  headers: IncomingHttpHeaders,
  data: string[],
): Promise<MockResponse<any>> => {
  const request = streamifyArray(data) as HttpRequest;
  request.url = requestUrl.pathname;
  request.method = method;
  request.headers = headers;
  request.headers.host = requestUrl.host;
  const response: MockResponse<any> = createResponse({
    eventEmitter: EventEmitter,
  });

  const endPromise = new Promise((resolve): void => {
    response.on('end', (): void => {
      expect(response._isEndCalled()).toBeTruthy();
      resolve();
    });
  });

  await handler.handleSafe({ request, response });
  await endPromise;

  return response;
};
