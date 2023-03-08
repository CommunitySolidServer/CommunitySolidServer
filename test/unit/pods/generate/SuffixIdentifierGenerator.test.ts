import { SuffixIdentifierGenerator } from '../../../../src/pods/generate/SuffixIdentifierGenerator';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';

describe('A SuffixIdentifierGenerator', (): void => {
  const base = 'http://example.com/';
  const generator = new SuffixIdentifierGenerator(base);

  it('generates identifiers by appending the slug.', async(): Promise<void> => {
    expect(generator.generate('slug')).toEqual({ path: `${base}slug/` });
  });

  it('converts non-alphanumerics to dashes.', async(): Promise<void> => {
    expect(generator.generate('sàl/u㋡g')).toEqual({ path: `${base}s-l-u-g/` });
  });

  it('can extract the pod from an identifier.', async(): Promise<void> => {
    const identifier = { path: 'http://example.com/foo/bar/baz' };
    expect(generator.extractPod(identifier)).toEqual({ path: 'http://example.com/foo/' });
  });

  it('can detect if the identifier itself is the pod.', async(): Promise<void> => {
    const identifier = { path: 'http://example.com/foo/' };
    expect(generator.extractPod(identifier)).toEqual({ path: 'http://example.com/foo/' });
  });

  it('errors when extracting if the identifier is in the wrong domain.', async(): Promise<void> => {
    const identifier = { path: 'http://bad.example.com/foo/bar/baz' };
    expect((): any => generator.extractPod(identifier)).toThrow(BadRequestHttpError);
  });

  it('errors when extracting if there is no pod.', async(): Promise<void> => {
    const identifier = { path: 'http://example.com/foo' };
    expect((): any => generator.extractPod(identifier)).toThrow(BadRequestHttpError);
  });
});
