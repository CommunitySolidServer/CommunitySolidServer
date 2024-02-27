import { SubdomainIdentifierGenerator } from '../../../../src/pods/generate/SubdomainIdentifierGenerator';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';

describe('A SubdomainIdentifierGenerator', (): void => {
  const base = 'http://example.com/';
  const generator = new SubdomainIdentifierGenerator(base);

  it('generates identifiers by using the slug as subdomain.', async(): Promise<void> => {
    expect(generator.generate('slug')).toEqual({ path: 'http://slug.example.com/' });
  });

  it('converts slugs using punycode.', async(): Promise<void> => {
    expect(generator.generate('sàl/u㋡g')).toEqual({ path: 'http://s-l-u-g.example.com/' });
  });

  it('can extract the pod from an identifier.', async(): Promise<void> => {
    const identifier = { path: 'http://foo.example.com/bar/baz' };
    expect(generator.extractPod(identifier)).toEqual({ path: 'http://foo.example.com/' });
  });

  it('can detect if the identifier itself is the pod.', async(): Promise<void> => {
    const identifier = { path: 'http://foo.example.com/' };
    expect(generator.extractPod(identifier)).toEqual({ path: 'http://foo.example.com/' });
  });

  it('errors when extracting if the identifier has the wrong scheme.', async(): Promise<void> => {
    const identifier = { path: 'https://foo.example.com/bar/baz' };
    expect((): any => generator.extractPod(identifier)).toThrow(BadRequestHttpError);
  });

  it('errors when extracting if there is no pod.', async(): Promise<void> => {
    const identifier = { path: 'http://example.com/bar/baz' };
    expect(generator.extractPod(identifier)).toEqual({ path: 'http://example.com/' });
  });

  it('errors when extracting if the domain is wrong.', async(): Promise<void> => {
    const identifier = { path: 'http://foo.example.org/bar/baz' };
    expect((): any => generator.extractPod(identifier)).toThrow(BadRequestHttpError);
  });
});
