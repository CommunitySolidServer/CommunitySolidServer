import {
  assertPassword,
  throwIdpInteractionError,
} from '../../../../../src/identity/interaction/email-password/EmailPasswordUtil';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';

describe('EmailPasswordUtil', (): void => {
  describe('#throwIdpInteractionError', (): void => {
    const prefilled = { test: 'data' };
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
        message: 'Unknown Error',
        prefilled,
      }));
    });
  });

  describe('#assertPassword', (): void => {
    it('validates the password against the confirmPassword.', async(): Promise<void> => {
      expect((): void => assertPassword(undefined, undefined)).toThrow('Password required');
      expect((): void => assertPassword([], undefined)).toThrow('Password required');
      expect((): void => assertPassword('password', undefined)).toThrow('Confirm Password required');
      expect((): void => assertPassword('password', [])).toThrow('Confirm Password required');
      expect((): void => assertPassword('password', 'confirmPassword'))
        .toThrow('Password and confirm password do not match');
      expect(assertPassword('password', 'password')).toBeUndefined();
    });
  });
});
