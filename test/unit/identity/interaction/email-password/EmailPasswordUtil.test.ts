import {
  assertPassword,
  throwIdpInteractionError,
} from '../../../../../src/identity/interaction/email-password/EmailPasswordUtil';
import { IdpInteractionError } from '../../../../../src/identity/interaction/util/IdpInteractionError';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';

describe('EmailPasswordUtil', (): void => {
  describe('#throwIdpInteractionError', (): void => {
    const prefilled = { test: 'data' };

    it('copies the values of other IdpInteractionErrors.', async(): Promise<void> => {
      const error = new IdpInteractionError(404, 'Not found!', { test2: 'data2' });
      expect((): never => throwIdpInteractionError(error, prefilled)).toThrow(expect.objectContaining({
        statusCode: error.statusCode,
        message: error.message,
        prefilled: { ...error.prefilled, ...prefilled },
      }));
    });

    it('re-throws IdpInteractionErrors if there are no new prefilled values.', async(): Promise<void> => {
      const error = new IdpInteractionError(404, 'Not found!', { test2: 'data2' });
      expect((): never => throwIdpInteractionError(error)).toThrow(error);
    });

    it('copies status code and message for HttpErrors.', async(): Promise<void> => {
      const error = new NotFoundHttpError('Not found!');
      expect((): never => throwIdpInteractionError(error, prefilled)).toThrow(expect.objectContaining({
        statusCode: error.statusCode,
        message: error.message,
        prefilled,
      }));
    });

    it('copies message for native Errors.', async(): Promise<void> => {
      const error = new Error('Error!');
      expect((): never => throwIdpInteractionError(error, prefilled)).toThrow(expect.objectContaining({
        statusCode: 500,
        message: error.message,
        prefilled,
      }));
    });

    it('defaults all values in case a non-native Error object gets thrown.', async(): Promise<void> => {
      const error = 'Error!';
      expect((): never => throwIdpInteractionError(error, prefilled)).toThrow(expect.objectContaining({
        statusCode: 500,
        message: 'Unknown error: Error!',
        prefilled,
      }));
    });
  });

  describe('#assertPassword', (): void => {
    it('validates the password against the confirmPassword.', async(): Promise<void> => {
      expect((): void => assertPassword(undefined, undefined)).toThrow('Please enter a password.');
      expect((): void => assertPassword([], undefined)).toThrow('Please enter a password.');
      expect((): void => assertPassword('password', undefined)).toThrow('Please confirm your password.');
      expect((): void => assertPassword('password', [])).toThrow('Please confirm your password.');
      expect((): void => assertPassword('password', 'other')).toThrow('Your password and confirmation did not match');
      expect(assertPassword('password', 'password')).toBeUndefined();
    });
  });
});
