import {
  assertPassword,
} from '../../../../../src/identity/interaction/email-password/EmailPasswordUtil';

describe('EmailPasswordUtil', (): void => {
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
