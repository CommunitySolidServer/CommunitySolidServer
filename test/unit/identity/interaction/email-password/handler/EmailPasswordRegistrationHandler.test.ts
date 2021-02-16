import {
  EmailPasswordRegistrationHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/EmailPasswordRegistrationHandler';

describe('EmailPasswordRegistrationHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(EmailPasswordRegistrationHandler).toBeDefined();
  });
});
