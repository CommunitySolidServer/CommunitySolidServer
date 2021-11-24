import { OriginalUrlExtractor } from '../../../../../src/http/input/identifier/OriginalUrlExtractor';

describe('A OriginalUrlExtractor', (): void => {
  const extractor = new OriginalUrlExtractor();

  it('can handle any input.', async(): Promise<void> => {
    await expect(extractor.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('errors if there is no URL.', async(): Promise<void> => {
    await expect(extractor.handle({ request: { headers: { host: 'test.com' }} as any })).rejects.toThrow('Missing URL');
  });

  it('errors if there is no host.', async(): Promise<void> => {
    await expect(extractor.handle({ request: { url: 'url', headers: {}} as any }))
      .rejects.toThrow('Missing Host header');
  });

  it('errors if the host is invalid.', async(): Promise<void> => {
    await expect(extractor.handle({ request: { url: 'url', headers: { host: 'test.com/forbidden' }} as any }))
      .rejects.toThrow('The request has an invalid Host header: test.com/forbidden');
  });

  it('returns the input URL.', async(): Promise<void> => {
    await expect(extractor.handle({ request: { url: 'url', headers: { host: 'test.com' }} as any }))
      .resolves.toEqual({ path: 'http://test.com/url' });
  });

  it('returns an input URL with query string.', async(): Promise<void> => {
    const noQuery = new OriginalUrlExtractor({ includeQueryString: false });
    await expect(noQuery.handle({ request: { url: '/url?abc=def&xyz', headers: { host: 'test.com' }} as any }))
      .resolves.toEqual({ path: 'http://test.com/url' });
  });

  it('returns an input URL with multiple leading slashes.', async(): Promise<void> => {
    const noQuery = new OriginalUrlExtractor({ includeQueryString: true });
    await expect(noQuery.handle({ request: { url: '///url?abc=def&xyz', headers: { host: 'test.com' }} as any }))
      .resolves.toEqual({ path: 'http://test.com///url?abc=def&xyz' });
  });

  it('drops the query string when includeQueryString is set to false.', async(): Promise<void> => {
    await expect(extractor.handle({ request: { url: '/url?abc=def&xyz', headers: { host: 'test.com' }} as any }))
      .resolves.toEqual({ path: 'http://test.com/url?abc=def&xyz' });
  });

  it('supports host:port combinations.', async(): Promise<void> => {
    await expect(extractor.handle({ request: { url: 'url', headers: { host: 'localhost:3000' }} as any }))
      .resolves.toEqual({ path: 'http://localhost:3000/url' });
  });

  it('uses https protocol if the connection is secure.', async(): Promise<void> => {
    await expect(extractor.handle(
      { request: { url: 'url', headers: { host: 'test.com' }, connection: { encrypted: true } as any } as any },
    )).resolves.toEqual({ path: 'https://test.com/url' });
  });

  it('encodes paths.', async(): Promise<void> => {
    await expect(extractor.handle({ request: { url: '/a%20path%26/name', headers: { host: 'test.com' }} as any }))
      .resolves.toEqual({ path: 'http://test.com/a%20path%26/name' });

    await expect(extractor.handle({ request: { url: '/a path%26/name', headers: { host: 'test.com' }} as any }))
      .resolves.toEqual({ path: 'http://test.com/a%20path%26/name' });

    await expect(extractor.handle({ request: { url: '/path&%26/name', headers: { host: 'test.com' }} as any }))
      .resolves.toEqual({ path: 'http://test.com/path%26%26/name' });
  });

  it('encodes hosts.', async(): Promise<void> => {
    await expect(extractor.handle({ request: { url: '/', headers: { host: '點看' }} as any }))
      .resolves.toEqual({ path: 'http://xn--c1yn36f/' });
  });

  it('ignores an irrelevant Forwarded header.', async(): Promise<void> => {
    const headers = {
      host: 'test.com',
      forwarded: 'by=203.0.113.60',
    };
    await expect(extractor.handle({ request: { url: '/foo/bar', headers } as any }))
      .resolves.toEqual({ path: 'http://test.com/foo/bar' });
  });

  it('takes the Forwarded header into account.', async(): Promise<void> => {
    const headers = {
      host: 'test.com',
      forwarded: 'proto=https;host=pod.example',
    };
    await expect(extractor.handle({ request: { url: '/foo/bar', headers } as any }))
      .resolves.toEqual({ path: 'https://pod.example/foo/bar' });
  });

  it('should fallback to x-fowarded-* headers.', async(): Promise<void> => {
    const headers = {
      host: 'test.com',
      'x-forwarded-host': 'pod.example',
      'x-forwarded-proto': 'https',
    };
    await expect(extractor.handle({ request: { url: '/foo/bar', headers } as any }))
      .resolves.toEqual({ path: 'https://pod.example/foo/bar' });
  });

  it('should just take x-forwarded-host if provided.', async(): Promise<void> => {
    const headers = {
      host: 'test.com',
      'x-forwarded-host': 'pod.example',
    };
    await expect(extractor.handle({ request: { url: '/foo/bar', headers } as any }))
      .resolves.toEqual({ path: 'http://pod.example/foo/bar' });
  });

  it('should just take x-forwarded-protocol if provided.', async(): Promise<void> => {
    const headers = {
      host: 'test.com',
      'x-forwarded-proto': 'https',
    };
    await expect(extractor.handle({ request: { url: '/foo/bar', headers } as any }))
      .resolves.toEqual({ path: 'https://test.com/foo/bar' });
  });

  it('should prefer forwarded header to x-forwarded-* headers.', async(): Promise<void> => {
    const headers = {
      host: 'test.com',
      forwarded: 'proto=http;host=pod.example',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'anotherpod.example',
    };
    await expect(extractor.handle({ request: { url: '/foo/bar', headers } as any }))
      .resolves.toEqual({ path: 'http://pod.example/foo/bar' });
  });

  it('should just take the first x-forwarded-* value.', async(): Promise<void> => {
    const headers = {
      host: 'test.com',
      'x-forwarded-host': 'pod.example, another.domain',
      'x-forwarded-proto': 'http,https',
    };
    await expect(extractor.handle({ request: { url: '/foo/bar', headers } as any }))
      .resolves.toEqual({ path: 'http://pod.example/foo/bar' });
  });
});
