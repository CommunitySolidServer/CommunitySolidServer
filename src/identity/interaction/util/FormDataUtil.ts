import type { ParsedUrlQuery } from 'querystring';
import { parse } from 'querystring';
import type { HttpRequest } from '../../../server/HttpRequest';
import { APPLICATION_X_WWW_FORM_URLENCODED } from '../../../util/ContentTypes';
import { UnsupportedMediaTypeHttpError } from '../../../util/errors/UnsupportedMediaTypeHttpError';
import { readableToString } from '../../../util/StreamUtil';

/**
 * Takes in a request and parses its body as 'application/x-www-form-urlencoded'
 */
export async function getFormDataRequestBody(request: HttpRequest): Promise<ParsedUrlQuery> {
  if (request.headers['content-type'] !== APPLICATION_X_WWW_FORM_URLENCODED) {
    throw new UnsupportedMediaTypeHttpError();
  }
  const body = await readableToString(request);
  return parse(body);
}
