import { SubdomainIdentifierGenerator } from '../../../../src/pods/generate/SubdomainIdentifierGenerator';

describe('A SubdomainIdentifierGenerator', (): void => {
  const base = 'http://test.com/';
  const generator = new SubdomainIdentifierGenerator(base);

  it('generates identifiers by using the slug as subdomain.', async(): Promise<void> => {
    expect(generator.generate('slug')).toEqual({ path: 'http://slug.test.com/' });
  });

  it('converts slugs using punycode.', async(): Promise<void> => {
    expect(generator.generate('sàl/u㋡g')).toEqual({ path: 'http://s-l-u-g.test.com/' });
  });
});
