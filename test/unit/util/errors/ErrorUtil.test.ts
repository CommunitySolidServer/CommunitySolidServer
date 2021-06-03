import { assertNativeError, getStatusCode, isNativeError } from '../../../../src/util/errors/ErrorUtil';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';

describe('ErrorUtil', (): void => {
  describe('#isNativeError', (): void => {
    it('returns true on native errors.', async(): Promise<void> => {
      expect(isNativeError(new Error('error'))).toBe(true);
    });

    it('returns false on other values.', async(): Promise<void> => {
      expect(isNativeError('apple')).toBe(false);
    });
  });

  describe('#assertNativeError', (): void => {
    it('returns undefined on native errors.', async(): Promise<void> => {
      expect(assertNativeError(new Error('error'))).toBeUndefined();
    });

    it('throws on other values.', async(): Promise<void> => {
      expect((): void => assertNativeError('apple')).toThrow('apple');
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
