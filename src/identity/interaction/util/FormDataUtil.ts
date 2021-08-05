import type { ParsedUrlQuery } from 'querystring';
import { parse } from 'querystring';
import type { Operation } from '../../../ldp/operations/Operation';
import { APPLICATION_X_WWW_FORM_URLENCODED } from '../../../util/ContentTypes';
import { UnsupportedMediaTypeHttpError } from '../../../util/errors/UnsupportedMediaTypeHttpError';
import { readableToString } from '../../../util/StreamUtil';

/**
 * Takes in an operation and parses its body as 'application/x-www-form-urlencoded'
 */
export async function getFormDataRequestBody(operation: Operation): Promise<ParsedUrlQuery> {
  if (operation.body?.metadata.contentType !== APPLICATION_X_WWW_FORM_URLENCODED) {
    throw new UnsupportedMediaTypeHttpError();
  }
  const body = await readableToString(operation.body.data);
  return parse(body);
}
