import {
  EmailPasswordResetPasswordHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/EmailPasswordResetPasswordHandler';

describe('EmailPasswordResetPasswordHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(EmailPasswordResetPasswordHandler).toBeDefined();
  });
});
