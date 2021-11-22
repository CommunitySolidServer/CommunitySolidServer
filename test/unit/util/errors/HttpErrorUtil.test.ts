import { HttpError } from '../../../../src/util/errors/HttpError';
import { createAggregateError, getStatusCode } from '../../../../src/util/errors/HttpErrorUtil';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';

describe('ErrorUtil', (): void => {
  describe('createAggregateError', (): void => {
    const error401 = new HttpError(401, 'UnauthorizedHttpError');
    const error415 = new HttpError(415, 'UnsupportedMediaTypeHttpError');
    const error501 = new HttpError(501, 'NotImplementedHttpError');
    const error = new Error('noStatusCode');

    it('throws an error with matching status code if all errors have the same.', async(): Promise<void> => {
      expect(createAggregateError([ error401, error401 ])).toMatchObject({
        statusCode: 401,
        name: 'UnauthorizedHttpError',
      });
    });

    it('throws an InternalServerError if one of the errors has status code 5xx.', async(): Promise<void> => {
      expect(createAggregateError([ error401, error501 ])).toMatchObject({
        statusCode: 500,
        name: 'InternalServerError',
      });
    });

    it('throws an BadRequestHttpError if all handlers have 4xx status codes.', async(): Promise<void> => {
      expect(createAggregateError([ error401, error415 ])).toMatchObject({
        statusCode: 400,
        name: 'BadRequestHttpError',
      });
    });

    it('interprets non-HTTP errors as internal errors.', async(): Promise<void> => {
      expect(createAggregateError([ error ])).toMatchObject({
        statusCode: 500,
        name: 'InternalServerError',
      });
    });
  });

  describe('#getStatusCode', (): void => {
    it('returns the corresponding status code for HttpErrors.', async(): Promise<void> => {
      expect(getStatusCode(new NotFoundHttpError())).toBe(404);
    });

    it('returns 500 for other errors.', async(): Promise<void> => {
      expect(getStatusCode(new Error('404'))).toBe(500);
    });
  });
});
