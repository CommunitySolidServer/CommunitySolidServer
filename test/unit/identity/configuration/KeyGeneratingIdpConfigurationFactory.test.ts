import {
  KeyGeneratingIdpConfigurationGenerator,
} from '../../../../src/identity/configuration/KeyGeneratingIdpConfigurationGenerator';

describe('KeyGeneratingIdpConfigurationGenerator', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(KeyGeneratingIdpConfigurationGenerator).toBeDefined();
  });
});
