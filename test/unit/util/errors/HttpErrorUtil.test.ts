import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { HttpError } from '../../../../src/util/errors/HttpError';
import {
  createAggregateError,
  errorTermsToMetadata,
  extractErrorTerms,
} from '../../../../src/util/errors/HttpErrorUtil';
import { toPredicateTerm } from '../../../../src/util/TermUtil';

describe('HttpErrorUtil', (): void => {
  describe('#errorTermsToMetadata', (): void => {
    it('creates a metadata object with the necessary triples.', async(): Promise<void> => {
      const metadata = errorTermsToMetadata({
        test: 'apple',
        test2: 'pear',
        not: undefined,
      });
      expect(metadata.quads()).toHaveLength(2);
      expect(metadata.get(toPredicateTerm('urn:npm:solid:community-server:error-term:test'))?.value).toBe('apple');
      expect(metadata.get(toPredicateTerm('urn:npm:solid:community-server:error-term:test2'))?.value).toBe('pear');
    });

    it('can add the necessary triples to existing metadata.', async(): Promise<void> => {
      const metadata = new RepresentationMetadata();
      const response = errorTermsToMetadata({
        test: 'apple',
        test2: 'pear',
        not: undefined,
      }, metadata);
      expect(response).toBe(metadata);
      expect(metadata.quads()).toHaveLength(2);
      expect(metadata.get(toPredicateTerm('urn:npm:solid:community-server:error-term:test'))?.value).toBe('apple');
      expect(metadata.get(toPredicateTerm('urn:npm:solid:community-server:error-term:test2'))?.value).toBe('pear');
    });
  });

  describe('#extractErrorTerms', (): void => {
    it('returns an object describing the terms.', async(): Promise<void> => {
      const metadata = new RepresentationMetadata({
        'urn:npm:solid:community-server:error-term:test': 'apple',
        'urn:npm:solid:community-server:error-term:test2': 'pear',
        'urn:npm:solid:community-server:other:test3': 'mango',
      });
      expect(extractErrorTerms(metadata)).toEqual({
        test: 'apple',
        test2: 'pear',
      });
    });
  });

  describe('#createAggregateError', (): void => {
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

    it('has no error message if none of the errors had one.', async(): Promise<void> => {
      expect(createAggregateError([ error401, error501 ]).message).toBe('');
    });

    it('copies the error message if there is one error with a message.', async(): Promise<void> => {
      expect(createAggregateError([ error, error501 ]).message).toBe('noStatusCode');
    });

    it('joins the error messages if there are multiple.', async(): Promise<void> => {
      expect(createAggregateError([ error, error, error501 ]).message)
        .toBe('Multiple handler errors: noStatusCode, noStatusCode');
    });
  });
});
