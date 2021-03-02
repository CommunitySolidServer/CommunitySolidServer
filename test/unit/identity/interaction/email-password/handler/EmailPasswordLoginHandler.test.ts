import {
  EmailPasswordLoginHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/EmailPasswordLoginHandler';

describe('EmailPasswordLoginHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(EmailPasswordLoginHandler).toBeDefined();
  });
});
