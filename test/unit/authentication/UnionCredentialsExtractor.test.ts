import type { Credentials } from '../../../src/authentication/Credentials';
import type { CredentialsExtractor } from '../../../src/authentication/CredentialsExtractor';
import { UnionCredentialsExtractor } from '../../../src/authentication/UnionCredentialsExtractor';
import type { HttpRequest } from '../../../src/server/HttpRequest';

describe('A UnionCredentialsExtractor', (): void => {
  const agent: Credentials = { agent: { webId: 'http://user.example.com/#me' }};
  const client: Credentials = { client: { clientId: 'http://client.example.com/#me' }};
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
        handle: jest.fn().mockResolvedValue(client),
      } as any,
    ];

    extractor = new UnionCredentialsExtractor(extractors);
  });

  it('combines the results of the extractors.', async(): Promise<void> => {
    await expect(extractor.handle(request)).resolves.toEqual({
      agent: agent.agent,
      client: client.client,
    });
  });

  it('ignores undefined values.', async(): Promise<void> => {
    extractors[1].handle.mockResolvedValueOnce({
      client: client.client,
      agent: undefined,
    });
    await expect(extractor.handle(request)).resolves.toEqual({
      agent: agent.agent,
      client: client.client,
    });
  });

  it('skips erroring handlers.', async(): Promise<void> => {
    extractors[0].handle.mockRejectedValueOnce(new Error('error'));
    await expect(extractor.handle(request)).resolves.toEqual({
      client: client.client,
    });
  });
});
