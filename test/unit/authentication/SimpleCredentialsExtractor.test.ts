import { HttpRequest } from '../../../src/server/HttpRequest';
import { SimpleCredentialsExtractor } from '../../../src/authentication/SimpleCredentialsExtractor';

describe('A SimpleCredentialsExtractor', (): void => {
  const extractor = new SimpleCredentialsExtractor();

  it('can handle all input.', async(): Promise<void> => {
    await expect(extractor.canHandle()).resolves.toBeUndefined();
  });

  it('returns undefined if there is no input.', async(): Promise<void> => {
    await expect(extractor.handle({ headers: {}} as HttpRequest)).resolves.toEqual({});
  });

  it('returns the authorization header as webID if there is one.', async(): Promise<void> => {
    await expect(extractor.handle({ headers: { authorization: 'test' }} as HttpRequest))
      .resolves.toEqual({ webID: 'test' });
  });
});
