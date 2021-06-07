import { assertError, createErrorMessage, getStatusCode, isError } from '../../../../src/util/errors/ErrorUtil';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';

describe('ErrorUtil', (): void => {
  describe('#isError', (): void => {
    it('returns true on native errors.', async(): Promise<void> => {
      expect(isError(new Error('error'))).toBe(true);
    });

    it('returns true on error-like objects.', async(): Promise<void> => {
      expect(isError({ name: 'name', message: 'message', stack: 'stack' })).toBe(true);
    });

    it('returns true on errors without a stack.', async(): Promise<void> => {
      expect(isError({ name: 'name', message: 'message' })).toBe(true);
    });

    it('returns false on other values.', async(): Promise<void> => {
      expect(isError('apple')).toBe(false);
    });
  });

  describe('#assertError', (): void => {
    it('returns undefined on native errors.', async(): Promise<void> => {
      expect(assertError(new Error('error'))).toBeUndefined();
    });

    it('throws on other values.', async(): Promise<void> => {
      expect((): void => assertError('apple')).toThrow('apple');
    });
  });

  describe('#createErrorMessage', (): void => {
    it('returns the given message for normal Errors.', async(): Promise<void> => {
      expect(createErrorMessage(new Error('error msg'))).toBe('error msg');
    });

    it('tries to put the object in a string .', async(): Promise<void> => {
      expect(createErrorMessage('apple')).toBe('Unknown error: apple');
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
