import {
  EmailPasswordInteractionPolicy,
} from '../../../../../src/identity/interaction/email-password/EmailPasswordInteractionPolicy';

describe('EmailPasswordInteractionPolicyHttpHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(EmailPasswordInteractionPolicy).toBeDefined();
  });
});
