import { PublicCredentialsExtractor } from '../../../src/authentication/PublicCredentialsExtractor';
import type { HttpRequest } from '../../../src/server/HttpRequest';

describe('A PublicCredentialsExtractor', (): void => {
  const extractor = new PublicCredentialsExtractor();

  it('returns the empty credentials.', async(): Promise<void> => {
    const headers = {};
    const result = extractor.handleSafe({ headers } as HttpRequest);
    await expect(result).resolves.toEqual({});
  });
});
