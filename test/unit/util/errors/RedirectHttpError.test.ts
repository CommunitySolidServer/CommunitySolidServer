import { FoundHttpError } from '../../../../src/util/errors/FoundHttpError';
import type { HttpErrorOptions } from '../../../../src/util/errors/HttpError';
import { generateHttpErrorUri } from '../../../../src/util/errors/HttpError';
import { MovedPermanentlyHttpError } from '../../../../src/util/errors/MovedPermanentlyHttpError';
import { PermanentRedirectHttpError } from '../../../../src/util/errors/PermanentRedirectHttpError';
import { RedirectHttpError } from '../../../../src/util/errors/RedirectHttpError';
import type { RedirectHttpErrorClass } from '../../../../src/util/errors/RedirectHttpError';
import { SeeOtherHttpError } from '../../../../src/util/errors/SeeOtherHttpError';
import { TemporaryRedirectHttpError } from '../../../../src/util/errors/TemporaryRedirectHttpError';
import { HTTP, SOLID_ERROR, SOLID_HTTP } from '../../../../src/util/Vocabularies';

// Used to make sure the RedirectHttpError constructor also gets called in a test.
class FixedRedirectHttpError extends RedirectHttpError {
  public static readonly statusCode = 0;
  public static readonly uri = generateHttpErrorUri(0);

  public constructor(location: string, message?: string, options?: HttpErrorOptions) {
    super(0, 'RedirectHttpError', location, message, options);
  }
}

describe('RedirectHttpError', (): void => {
  const errors: [string, number, RedirectHttpErrorClass][] = [
    [ 'RedirectHttpError', 0, FixedRedirectHttpError ],
    [ 'MovedPermanentlyHttpError', 301, MovedPermanentlyHttpError ],
    [ 'FoundHttpError', 302, FoundHttpError ],
    [ 'SeeOtherHttpError', 303, SeeOtherHttpError ],
    [ 'TemporaryRedirectHttpError', 307, TemporaryRedirectHttpError ],
    [ 'PermanentRedirectHttpError', 308, PermanentRedirectHttpError ],
  ];

  describe.each(errors)('%s', (name, statusCode, constructor): void => {
    const location = 'http://test.com/foo/bar';
    const options = {
      cause: new Error('cause'),
      errorCode: 'E1234',
      details: {},
    };
    const instance = new constructor(location, 'my message', options);

    it(`is an instance of ${name}.`, (): void => {
      expect(constructor.isInstance(instance)).toBeTruthy();
    });

    it(`has name ${name}.`, (): void => {
      expect(instance.name).toBe(name);
    });

    it(`has status code ${statusCode}.`, (): void => {
      expect(instance.statusCode).toBe(statusCode);
    });

    it('sets the location.', (): void => {
      expect(instance.location).toBe(location);
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
      expect(new constructor(location).errorCode).toBe(`H${statusCode}`);
    });

    it('sets the details.', (): void => {
      expect(instance.metadata.get(SOLID_ERROR.terms.errorResponse)?.value)
        .toBe(`${SOLID_ERROR.namespace}H${statusCode}`);
      expect(instance.metadata.get(HTTP.terms.statusCodeNumber)?.value).toBe(`${statusCode}`);
      expect(instance.metadata.get(SOLID_HTTP.terms.location)?.value).toBe(location);
    });
  });
});
