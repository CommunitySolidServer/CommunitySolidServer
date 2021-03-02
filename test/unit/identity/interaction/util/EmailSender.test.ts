import {
  EmailSender,
} from '../../../../../src/identity/interaction/util/EmailSender';

describe('BasicIssuerReferenceWebIdOwnershipValidator', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(EmailSender).toBeDefined();
  });
});
