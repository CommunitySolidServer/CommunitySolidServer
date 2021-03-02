import {
  BasicIssuerReferenceWebIdOwnershipValidator,
} from '../../../../../src/identity/interaction/util/BasicIssuerReferenceWebIdOwnershipValidator';

describe('BasicIssuerReferenceWebIdOwnershipValidator', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(BasicIssuerReferenceWebIdOwnershipValidator).toBeDefined();
  });
});
