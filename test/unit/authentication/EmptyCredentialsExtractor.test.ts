import { CredentialGroup } from '../../../src/authentication/Credentials';
import { EmptyCredentialsExtractor } from '../../../src/authentication/EmptyCredentialsExtractor';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';

describe('An EmptyCredentialsExtractor', (): void => {
  const extractor = new EmptyCredentialsExtractor();

  it('throws an error if an Authorization header is specified.', async(): Promise<void> => {
    const headers = { authorization: 'Other http://alice.example/card#me' };
    const result = extractor.handleSafe({ headers } as HttpRequest);
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('Unexpected Authorization scheme.');
  });

  it('returns the empty credentials.', async(): Promise<void> => {
    const headers = {};
    const result = extractor.handleSafe({ headers } as HttpRequest);
    await expect(result).resolves.toEqual({ [CredentialGroup.public]: {}});
  });
});
