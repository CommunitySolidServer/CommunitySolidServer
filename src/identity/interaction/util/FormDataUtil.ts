import type { ParsedUrlQuery } from 'querystring';
import { parse } from 'querystring';
import type { HttpRequest } from '../../../server/HttpRequest';
import { UnsupportedMediaTypeHttpError } from '../../../util/errors/UnsupportedMediaTypeHttpError';
import { readableToString } from '../../../util/StreamUtil';

/**
 * Takes in a request and parses its body as 'application/x-www-form-urlencoded'
 */
export async function getFormDataRequestBody(request: HttpRequest): Promise<ParsedUrlQuery> {
  if (request.headers['content-type'] !== 'application/x-www-form-urlencoded') {
    throw new UnsupportedMediaTypeHttpError();
  }
  const body = await readableToString(request);
  return parse(body);
}
