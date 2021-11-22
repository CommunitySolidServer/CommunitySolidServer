import { CredentialGroup } from '../../../src/authentication/Credentials';
import type { CredentialSet } from '../../../src/authentication/Credentials';
import type { CredentialsExtractor } from '../../../src/authentication/CredentialsExtractor';
import { UnionCredentialsExtractor } from '../../../src/authentication/UnionCredentialsExtractor';
import type { HttpRequest } from '../../../src/server/HttpRequest';

describe('A UnionCredentialsExtractor', (): void => {
  const agent: CredentialSet = { [CredentialGroup.agent]: { webId: 'http://test.com/#me' }};
  const everyone: CredentialSet = { [CredentialGroup.public]: {}};
  const request: HttpRequest = {} as any;
  let extractors: jest.Mocked<CredentialsExtractor>[];
  let extractor: UnionCredentialsExtractor;

  beforeEach(async(): Promise<void> => {
    extractors = [
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue(agent),
      } as any,
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue(everyone),
      } as any,
    ];

    extractor = new UnionCredentialsExtractor(extractors);
  });

  it('combines the results of the extractors.', async(): Promise<void> => {
    await expect(extractor.handle(request)).resolves.toEqual({
      [CredentialGroup.agent]: agent.agent,
      [CredentialGroup.public]: {},
    });
  });

  it('ignores undefined values.', async(): Promise<void> => {
    extractors[1].handle.mockResolvedValueOnce({
      [CredentialGroup.public]: {},
      [CredentialGroup.agent]: undefined,
    });
    await expect(extractor.handle(request)).resolves.toEqual({
      [CredentialGroup.agent]: agent.agent,
      [CredentialGroup.public]: {},
    });
  });

  it('skips erroring handlers.', async(): Promise<void> => {
    extractors[0].handle.mockRejectedValueOnce(new Error('error'));
    await expect(extractor.handle(request)).resolves.toEqual({
      [CredentialGroup.public]: {},
    });
  });
});
