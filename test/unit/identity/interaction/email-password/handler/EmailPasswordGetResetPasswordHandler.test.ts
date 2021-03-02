import {
  EmailPasswordGetResetPasswordHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/EmailPasswordGetResetPasswordHandler';

describe('EmailPasswordGetResetPasswordHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(EmailPasswordGetResetPasswordHandler).toBeDefined();
  });
});
