import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
import { ForbiddenHttpError } from '../../../../src/util/errors/ForbiddenHttpError';
import { HttpError } from '../../../../src/util/errors/HttpError';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { MethodNotAllowedHttpError } from '../../../../src/util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { UnauthorizedHttpError } from '../../../../src/util/errors/UnauthorizedHttpError';
import { UnsupportedMediaTypeHttpError } from '../../../../src/util/errors/UnsupportedMediaTypeHttpError';

// Only used to make typings easier in the tests
class FixedHttpError extends HttpError {
  public constructor(message?: string) {
    super(0, '', message);
  }
}

describe('An HttpError', (): void => {
  const errors: [string, number, typeof FixedHttpError][] = [
    [ 'BadRequestHttpError', 400, BadRequestHttpError ],
    [ 'UnauthorizedHttpError', 401, UnauthorizedHttpError ],
    [ 'ForbiddenHttpError', 403, ForbiddenHttpError ],
    [ 'NotFoundHttpError', 404, NotFoundHttpError ],
    [ 'MethodNotAllowedHttpError', 405, MethodNotAllowedHttpError ],
    [ 'ConflictHttpError', 409, ConflictHttpError ],
    [ 'MethodNotAllowedHttpError', 405, MethodNotAllowedHttpError ],
    [ 'UnsupportedMediaTypeHttpError', 415, UnsupportedMediaTypeHttpError ],
    [ 'InternalServerError', 500, InternalServerError ],
    [ 'NotImplementedHttpError', 501, NotImplementedHttpError ],
  ];

  it.each(errors)('%s is valid', (name, statusCode, constructor): void => {
    const instance = new constructor('message');
    expect(constructor.isInstance(instance)).toBeTruthy();
    expect(instance.statusCode).toBe(statusCode);
    expect(instance.name).toBe(name);
    expect(instance.message).toBe('message');
  });
});
