import { stringify } from 'querystring';
import type { HttpRequest } from '../../../../../../src/server/HttpRequest';
import { guardedStreamFrom } from '../../../../../../src/util/StreamUtil';

/**
 * Creates a mock HttpRequest which is a stream of an object encoded as application/x-www-form-urlencoded
 * and a matching content-type header.
 * @param data - Object to encode.
 */
export function createRequest(data: NodeJS.Dict<any>): HttpRequest {
  const request = guardedStreamFrom(stringify(data)) as HttpRequest;
  request.headers = { 'content-type': 'application/x-www-form-urlencoded' };
  return request;
}
