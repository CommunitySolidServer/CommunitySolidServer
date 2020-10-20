import { BasicTargetExtractor } from '../../../../src/ldp/http/BasicTargetExtractor';

describe('A BasicTargetExtractor', (): void => {
  const extractor = new BasicTargetExtractor();

  it('can handle any input.', async(): Promise<void> => {
    await expect(extractor.canHandle()).resolves.toBeUndefined();
  });

  it('errors if there is no URL.', async(): Promise<void> => {
    await expect(extractor.handle({ headers: { host: 'test.com' }} as any)).rejects.toThrow('Missing URL.');
  });

  it('errors if there is no host.', async(): Promise<void> => {
    await expect(extractor.handle({ url: 'url', headers: {}} as any)).rejects.toThrow('Missing host.');
  });

  it('returns the input URL.', async(): Promise<void> => {
    await expect(extractor.handle({ url: 'url', headers: { host: 'test.com' }} as any))
      .resolves.toEqual({ path: 'http://test.com/url' });
  });

  it('uses https protocol if the connection is secure.', async(): Promise<void> => {
    await expect(extractor.handle(
      { url: 'url', headers: { host: 'test.com' }, connection: { encrypted: true } as any } as any,
    )).resolves.toEqual({ path: 'https://test.com/url' });
  });

  it('encodes relevant characters.', async(): Promise<void> => {
    await expect(extractor.handle({ url: '/a%20path%26/name', headers: { host: 'test.com' }} as any))
      .resolves.toEqual({ path: 'http://test.com/a%20path%26/name' });

    await expect(extractor.handle({ url: '/a path%26/name', headers: { host: 'test.com' }} as any))
      .resolves.toEqual({ path: 'http://test.com/a%20path%26/name' });

    await expect(extractor.handle({ url: '/path&%26/name', headers: { host: 'test.com' }} as any))
      .resolves.toEqual({ path: 'http://test.com/path%26%26/name' });
  });
});
