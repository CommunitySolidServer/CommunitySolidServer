import {
  IdpInteractionPolicyHttpHandler,
} from '../../../../src/identity/interaction/IdpInteractionPolicyHttpHandler';

describe('IdpInteractionHttpHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(IdpInteractionPolicyHttpHandler).toBeDefined();
  });
});
