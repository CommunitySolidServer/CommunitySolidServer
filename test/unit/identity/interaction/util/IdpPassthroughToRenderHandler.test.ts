import {
  IdpPassthroughToRenderHandler,
} from '../../../../../src/identity/interaction/util/IdpPassthroughToRenderHandler';

describe('BasicIssuerReferenceWebIdOwnershipValidator', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(IdpPassthroughToRenderHandler).toBeDefined();
  });
});
