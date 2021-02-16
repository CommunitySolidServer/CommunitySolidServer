import {
  KeyGeneratingIdpConfigurationFactory,
} from '../../../../src/identity/configuration/KeyGeneratingIdpConfigurationFactory';

describe('KeyGeneratingIdpConfigurationFactory', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(KeyGeneratingIdpConfigurationFactory).toBeDefined();
  });
});
