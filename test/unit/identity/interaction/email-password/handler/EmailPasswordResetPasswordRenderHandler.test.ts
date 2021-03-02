import {
  EmailPasswordResetPasswordRenderHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/EmailPasswordResetPasswordRenderHandler';

describe('EmailPasswordResetPasswordRenderHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(EmailPasswordResetPasswordRenderHandler).toBeDefined();
  });
});
