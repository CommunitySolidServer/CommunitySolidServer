import {
  EmailPasswordForgotPasswordHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/EmailPasswordForgotPasswordHandler';

describe('EmailPasswordForgotPasswordHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(EmailPasswordForgotPasswordHandler).toBeDefined();
  });
});
