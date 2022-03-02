import { FoundHttpError } from '../../../../src/util/errors/FoundHttpError';
import type { HttpErrorOptions } from '../../../../src/util/errors/HttpError';
import { MovedPermanentlyHttpError } from '../../../../src/util/errors/MovedPermanentlyHttpError';
import { RedirectHttpError } from '../../../../src/util/errors/RedirectHttpError';

class FixedRedirectHttpError extends RedirectHttpError {
  public constructor(location: string, message?: string, options?: HttpErrorOptions) {
    super(0, location, '', message, options);
  }
}

describe('RedirectHttpError', (): void => {
  const errors: [string, number, typeof FixedRedirectHttpError][] = [
    [ 'MovedPermanentlyHttpError', 301, MovedPermanentlyHttpError ],
    [ 'FoundHttpError', 302, FoundHttpError ],
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
      expect(instance.details).toBe(options.details);
    });
  });
});
