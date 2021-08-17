import { HttpError } from '../../../../src/util/errors/HttpError';
import type { AsyncHandler } from '../../../../src/util/handlers/AsyncHandler';
import { createAggregateError, filterHandlers, findHandler } from '../../../../src/util/handlers/HandlerUtil';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('HandlerUtil', (): void => {
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

  describe('findHandler', (): void => {
    let handlerTrue: AsyncHandler<any, any>;
    let handlerFalse: AsyncHandler<any, any>;

    beforeEach(async(): Promise<void> => {
      handlerTrue = new StaticAsyncHandler(true, null);
      handlerFalse = new StaticAsyncHandler(false, null);
    });

    it('finds a matching handler.', async(): Promise<void> => {
      await expect(findHandler([ handlerFalse, handlerTrue ], null)).resolves.toBe(handlerTrue);
    });

    it('errors if there is no matching handler.', async(): Promise<void> => {
      await expect(findHandler([ handlerFalse, handlerFalse ], null)).rejects.toThrow('[Not supported, Not supported]');
    });

    it('supports non-native Errors.', async(): Promise<void> => {
      handlerFalse.canHandle = jest.fn().mockRejectedValue('apple');
      await expect(findHandler([ handlerFalse ], null)).rejects.toThrow('[Unknown error: apple]');
    });
  });

  describe('filterHandlers', (): void => {
    let handlerTrue: AsyncHandler<any, any>;
    let handlerFalse: AsyncHandler<any, any>;

    beforeEach(async(): Promise<void> => {
      handlerTrue = new StaticAsyncHandler(true, null);
      handlerFalse = new StaticAsyncHandler(false, null);
    });

    it('finds matching handlers.', async(): Promise<void> => {
      await expect(filterHandlers([ handlerTrue, handlerFalse, handlerTrue ], null))
        .resolves.toEqual([ handlerTrue, handlerTrue ]);
    });

    it('errors if there is no matching handler.', async(): Promise<void> => {
      await expect(filterHandlers([ handlerFalse, handlerFalse ], null))
        .rejects.toThrow('[Not supported, Not supported]');
    });
  });
});
