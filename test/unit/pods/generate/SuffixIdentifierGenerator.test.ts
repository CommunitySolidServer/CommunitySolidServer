import { SuffixIdentifierGenerator } from '../../../../src/pods/generate/SuffixIdentifierGenerator';

describe('A SuffixIdentifierGenerator', (): void => {
  const base = 'http://test.com/';
  const generator = new SuffixIdentifierGenerator(base);

  it('generates identifiers by appending the slug.', async(): Promise<void> => {
    expect(generator.generate('slug')).toEqual({ path: `${base}slug/` });
  });

  it('converts non-alphanumerics to dashes.', async(): Promise<void> => {
    expect(generator.generate('sàl/u㋡g')).toEqual({ path: `${base}s-l-u-g/` });
  });
});
