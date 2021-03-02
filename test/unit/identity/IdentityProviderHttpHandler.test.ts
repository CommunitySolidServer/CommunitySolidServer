import { IdentityProviderHttpHandler } from '../../../src/identity/IdentityProviderHttpHandler';

describe('IdentityProviderHttpHandler', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(IdentityProviderHttpHandler).toBeDefined();
  });
});
