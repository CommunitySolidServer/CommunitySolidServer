import { BasicTargetExtractor } from '../../../../src/ldp/http/BasicTargetExtractor';

describe('A BasicTargetExtractor', (): void => {
  const extractor = new BasicTargetExtractor();

  it('can handle input with an URL and host.', async(): Promise<void> => {
    await expect(extractor.canHandle({ url: 'url', headers: { host: 'test.com' }} as any)).resolves.toBeUndefined();
  });

  it('rejects input without URL.', async(): Promise<void> => {
    await expect(extractor.canHandle({ headers: { host: 'test.com' }} as any)).rejects.toThrow('Missing URL.');
  });

  it('rejects input without host.', async(): Promise<void> => {
    await expect(extractor.canHandle({ url: 'url', headers: {}} as any)).rejects.toThrow('Missing host.');
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
