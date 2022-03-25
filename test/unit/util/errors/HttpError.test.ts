import 'jest-rdf';
import { DataFactory } from 'n3';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
import { ForbiddenHttpError } from '../../../../src/util/errors/ForbiddenHttpError';
import { generateHttpErrorUri } from '../../../../src/util/errors/HttpError';
import type { HttpErrorClass } from '../../../../src/util/errors/HttpError';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { MethodNotAllowedHttpError } from '../../../../src/util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { PayloadHttpError } from '../../../../src/util/errors/PayloadHttpError';
import { PreconditionFailedHttpError } from '../../../../src/util/errors/PreconditionFailedHttpError';
import { UnauthorizedHttpError } from '../../../../src/util/errors/UnauthorizedHttpError';
import { UnprocessableEntityHttpError } from '../../../../src/util/errors/UnprocessableEntityHttpError';
import { UnsupportedMediaTypeHttpError } from '../../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { SOLID_ERROR } from '../../../../src/util/Vocabularies';
const { literal, namedNode, quad } = DataFactory;

describe('HttpError', (): void => {
  const errors: [string, number, HttpErrorClass][] = [
    [ 'BadRequestHttpError', 400, BadRequestHttpError ],
    [ 'UnauthorizedHttpError', 401, UnauthorizedHttpError ],
    [ 'ForbiddenHttpError', 403, ForbiddenHttpError ],
    [ 'NotFoundHttpError', 404, NotFoundHttpError ],
    [ 'MethodNotAllowedHttpError', 405, MethodNotAllowedHttpError ],
    [ 'ConflictHttpError', 409, ConflictHttpError ],
    [ 'PreconditionFailedHttpError', 412, PreconditionFailedHttpError ],
    [ 'PayloadHttpError', 413, PayloadHttpError ],
    [ 'UnsupportedMediaTypeHttpError', 415, UnsupportedMediaTypeHttpError ],
    [ 'UnprocessableEntityHttpError', 422, UnprocessableEntityHttpError ],
    [ 'InternalServerError', 500, InternalServerError ],
    [ 'NotImplementedHttpError', 501, NotImplementedHttpError ],
  ];

  describe.each(errors)('%s', (name, statusCode, constructor): void => {
    const options = {
      cause: new Error('cause'),
      errorCode: 'E1234',
      details: {},
    };
    const instance = new constructor('my message', options);

    it(`is an instance of ${name}.`, (): void => {
      expect(constructor.isInstance(instance)).toBeTruthy();
    });

    it('has a URI.', (): void => {
      expect(constructor.uri).toEqualRdfTerm(generateHttpErrorUri(statusCode));
    });

    it(`has name ${name}.`, (): void => {
      expect(instance.name).toBe(name);
    });

    it(`has status code ${statusCode}.`, (): void => {
      expect(instance.statusCode).toBe(statusCode);
    });

    it('sets the message.', (): void => {
      expect(instance.message).toBe('my message');
    });

    it('sets the cause.', (): void => {
      expect(instance.cause).toBe(options.cause);
    });

    it('sets the error code.', (): void => {
      expect(instance.errorCode).toBe(options.errorCode);
    });

    it('defaults to an HTTP-specific error code.', (): void => {
      expect(new constructor().errorCode).toBe(`H${statusCode}`);
    });

    it('sets the details.', (): void => {
      expect(instance.details).toBe(options.details);
    });

    it('generates metadata.', (): void => {
      const subject = namedNode('subject');
      expect(instance.generateMetadata(subject)).toBeRdfIsomorphic([
        quad(subject, SOLID_ERROR.terms.errorResponse, constructor.uri),
      ]);
    });
  });
});
