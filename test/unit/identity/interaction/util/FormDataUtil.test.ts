import { stringify } from 'querystring';
import {
  getFormDataRequestBody,
} from '../../../../../src/identity/interaction/util/FormDataUtil';
import type { Operation } from '../../../../../src/ldp/operations/Operation';
import { BasicRepresentation } from '../../../../../src/ldp/representation/BasicRepresentation';
import { UnsupportedMediaTypeHttpError } from '../../../../../src/util/errors/UnsupportedMediaTypeHttpError';

describe('FormDataUtil', (): void => {
  describe('#getFormDataRequestBody', (): void => {
    it('only supports form data.', async(): Promise<void> => {
      await expect(getFormDataRequestBody({ headers: { 'content-type': 'text/turtle' }} as any))
        .rejects.toThrow(UnsupportedMediaTypeHttpError);
    });

    it('converts the body to an object.', async(): Promise<void> => {
      const data = { test: 'test!', moreTest: '!TEST!' };
      const operation: Operation = {
        method: 'GET',
        preferences: {},
        target: { path: '' },
        body: new BasicRepresentation(stringify(data), 'application/x-www-form-urlencoded'),
      };
      await expect(getFormDataRequestBody(operation)).resolves.toEqual(data);
    });
  });
});
