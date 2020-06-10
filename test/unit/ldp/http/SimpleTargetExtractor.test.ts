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
    await expect(extractor.handle({ url: 'url' } as any)).resolves.toEqual({ path: 'url' });
  });
});
