import { stringify } from 'querystring';
import {
  getFormDataRequestBody,
} from '../../../../../src/identity/interaction/util/FormDataUtil';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import { UnsupportedMediaTypeHttpError } from '../../../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { guardedStreamFrom } from '../../../../../src/util/StreamUtil';

describe('FormDataUtil', (): void => {
  describe('#getFormDataRequestBody', (): void => {
    it('only supports form data.', async(): Promise<void> => {
      await expect(getFormDataRequestBody({ headers: { 'content-type': 'text/turtle' }} as any))
        .rejects.toThrow(UnsupportedMediaTypeHttpError);
    });

    it('converts the body to an object.', async(): Promise<void> => {
      const data = { test: 'test!', moreTest: '!TEST!' };
      const stream = guardedStreamFrom(stringify(data)) as HttpRequest;
      stream.headers = { 'content-type': 'application/x-www-form-urlencoded' };
      await expect(getFormDataRequestBody(stream)).resolves.toEqual(data);
    });
  });
});
