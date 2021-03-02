import {
  IdpInteractionHttpHandler,
} from '../../../../src/identity/interaction/IdpInteractionHttpHandler';

describe('IdpInteractionHttpHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(IdpInteractionHttpHandler).toBeDefined();
  });
});
