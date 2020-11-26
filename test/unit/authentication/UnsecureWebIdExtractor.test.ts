import { UnsecureWebIdExtractor } from '../../../src/authentication/UnsecureWebIdExtractor';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';

describe('An UnsecureWebIdExtractor', (): void => {
  const extractor = new UnsecureWebIdExtractor();

  it('throws an error if no Authorization header is specified.', async(): Promise<void> => {
    const headers = {};
    const result = extractor.handleSafe({ headers } as HttpRequest);
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('No WebID Authorization header specified.');
  });

  it('throws an error if a non-WebID Authorization header is specified.', async(): Promise<void> => {
    const headers = { authorization: 'Other http://alice.example/card#me' };
    const result = extractor.handleSafe({ headers } as HttpRequest);
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('No WebID Authorization header specified.');
  });

  it('returns the authorization header as WebID if there is one.', async(): Promise<void> => {
    const headers = { authorization: 'WebID http://alice.example/card#me' };
    const result = extractor.handleSafe({ headers } as HttpRequest);
    await expect(result).resolves.toEqual({ webID: 'http://alice.example/card#me' });
  });
});
