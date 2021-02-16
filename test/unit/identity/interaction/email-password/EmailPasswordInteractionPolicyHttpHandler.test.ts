import {
  EmailPasswordInteractionPolicyHttpHandler,
} from '../../../../../src/identity/interaction/email-password/EmailPasswordInteractionPolicyHttpHandler';

describe('EmailPasswordInteractionPolicyHttpHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(EmailPasswordInteractionPolicyHttpHandler).toBeDefined();
  });
});
