import { IdentityProviderFactory } from '../../../src/identity/IdentityProviderFactory';

describe('IdentityProviderFactory', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(IdentityProviderFactory).toBeDefined();
  });
});
