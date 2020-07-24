import { SimpleTargetExtractor } from '../../../../src/ldp/http/SimpleTargetExtractor';

describe('A SimpleTargetExtractor', (): void => {
  const extractor = new SimpleTargetExtractor();

  it('can handle input with an URL.', async(): Promise<void> => {
    await expect(extractor.canHandle({ url: 'url' } as any)).resolves.toBeUndefined();
  });

  it('rejects input without URL.', async(): Promise<void> => {
    await expect(extractor.canHandle({ } as any)).rejects.toThrow('Missing URL.');
  });

  it('returns the input URL.', async(): Promise<void> => {
    await expect(extractor.handle({ url: 'url', headers: { host: 'test.com' }} as any)).resolves.toEqual({ path: 'http://test.com/url' });
  });

  it('uses https protocol if the connection is secure.', async(): Promise<void> => {
    await expect(extractor.handle(
      { url: 'url', headers: { host: 'test.com' }, connection: { encrypted: true } as any } as any,
    )).resolves.toEqual({ path: 'https://test.com/url' });
  });
});
