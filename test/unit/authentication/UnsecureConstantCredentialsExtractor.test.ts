import { CredentialGroup } from '../../../src/authentication/Credentials';
import { UnsecureConstantCredentialsExtractor } from '../../../src/authentication/UnsecureConstantCredentialsExtractor';

describe('An UnsecureConstantCredentialsExtractor', (): void => {
  it('extracts a constant WebID.', async(): Promise<void> => {
    const agent = 'http://alice.example/card#me';
    const extractor = new UnsecureConstantCredentialsExtractor(agent);
    await expect(extractor.handle()).resolves.toEqual({ [CredentialGroup.agent]: { webId: agent }});
  });

  it('extracts constant credentials.', async(): Promise<void> => {
    const agent = {};
    const extractor = new UnsecureConstantCredentialsExtractor(agent);
    await expect(extractor.handle()).resolves.toEqual({ [CredentialGroup.agent]: agent });
  });
});
