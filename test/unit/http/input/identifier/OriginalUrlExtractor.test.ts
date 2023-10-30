import { SingleRootIdentifierStrategy } from '../../../../../src';
import { OriginalUrlExtractor } from '../../../../../src/http/input/identifier/OriginalUrlExtractor';

// Utility interface for defining the createExtractor utility method arguments
interface CreateExtractorArgs {
  baseUrl?: string;
  includeQueryString?: boolean;
}

// Helper function for instantiating an OriginalUrlExtractor
function createExtractor(args: CreateExtractorArgs = {}): OriginalUrlExtractor {
  const identifierStrategy = new SingleRootIdentifierStrategy(args.baseUrl ?? 'http://test.com');
  const extractor = new OriginalUrlExtractor({ identifierStrategy, includeQueryString: args.includeQueryString });
  return extractor;
}

describe('A OriginalUrlExtractor', (): void => {
  // Default extractor to use, some test cases may specify an alternative extractor
  const extractor = createExtractor();

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

  it('errors if the request URL base does not match the configured baseUrl.', async(): Promise<void> => {
    await expect(extractor.handle({ request: { url: 'url', headers: { host: 'example.com' }} as any }))
      .rejects.toThrow(`The identifier http://example.com/url is outside the configured identifier space.`);
  });

  it('returns the input URL.', async(): Promise<void> => {
    await expect(extractor.handle({ request: { url: 'url', headers: { host: 'test.com' }} as any }))
      .resolves.toEqual({ path: 'http://test.com/url' });
  });

  it('returns an input URL with query string.', async(): Promise<void> => {
    const noQuery = createExtractor({ includeQueryString: false });
    await expect(noQuery.handle({ request: { url: '/url?abc=def&xyz', headers: { host: 'test.com' }} as any }))
      .resolves.toEqual({ path: 'http://test.com/url' });
  });

  it('returns an input URL with multiple leading slashes.', async(): Promise<void> => {
    const noQuery = createExtractor({ includeQueryString: true });
    await expect(noQuery.handle({ request: { url: '///url?abc=def&xyz', headers: { host: 'test.com' }} as any }))
      .resolves.toEqual({ path: 'http://test.com///url?abc=def&xyz' });
  });

  it('drops the query string when includeQueryString is set to false.', async(): Promise<void> => {
    await expect(extractor.handle({ request: { url: '/url?abc=def&xyz', headers: { host: 'test.com' }} as any }))
      .resolves.toEqual({ path: 'http://test.com/url?abc=def&xyz' });
  });

  it('supports host:port combinations.', async(): Promise<void> => {
    const altExtractor = createExtractor({ baseUrl: 'http://localhost:3000/' });
    await expect(altExtractor.handle({ request: { url: 'url', headers: { host: 'localhost:3000' }} as any }))
      .resolves.toEqual({ path: 'http://localhost:3000/url' });
  });

  it('uses https protocol if the connection is secure.', async(): Promise<void> => {
    const altExtractor = createExtractor({ baseUrl: 'https://test.com/' });
    await expect(altExtractor.handle(
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
    const altExtractor = createExtractor({ baseUrl: 'http://xn--c1yn36f/' });
    await expect(altExtractor.handle({ request: { url: '/', headers: { host: '點看' }} as any }))
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
    const altExtractor = createExtractor({ baseUrl: 'https://pod.example/' });
    const headers = {
      host: 'test.com',
      forwarded: 'proto=https;host=pod.example',
    };
    await expect(altExtractor.handle({ request: { url: '/foo/bar', headers } as any }))
      .resolves.toEqual({ path: 'https://pod.example/foo/bar' });
  });

  it('should fallback to x-fowarded-* headers.', async(): Promise<void> => {
    const altExtractor = createExtractor({ baseUrl: 'https://pod.example/' });
    const headers = {
      host: 'test.com',
      'x-forwarded-host': 'pod.example',
      'x-forwarded-proto': 'https',
    };
    await expect(altExtractor.handle({ request: { url: '/foo/bar', headers } as any }))
      .resolves.toEqual({ path: 'https://pod.example/foo/bar' });
  });

  it('should just take x-forwarded-host if provided.', async(): Promise<void> => {
    const altExtractor = createExtractor({ baseUrl: 'http://pod.example/' });
    const headers = {
      host: 'test.com',
      'x-forwarded-host': 'pod.example',
    };
    await expect(altExtractor.handle({ request: { url: '/foo/bar', headers } as any }))
      .resolves.toEqual({ path: 'http://pod.example/foo/bar' });
  });

  it('should just take x-forwarded-protocol if provided.', async(): Promise<void> => {
    const altExtractor = createExtractor({ baseUrl: 'https://test.com/' });
    const headers = {
      host: 'test.com',
      'x-forwarded-proto': 'https',
    };
    await expect(altExtractor.handle({ request: { url: '/foo/bar', headers } as any }))
      .resolves.toEqual({ path: 'https://test.com/foo/bar' });
  });

  it('should prefer forwarded header to x-forwarded-* headers.', async(): Promise<void> => {
    const altExtractor = createExtractor({ baseUrl: 'http://pod.example/' });
    const headers = {
      host: 'test.com',
      forwarded: 'proto=http;host=pod.example',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'anotherpod.example',
    };
    await expect(altExtractor.handle({ request: { url: '/foo/bar', headers } as any }))
      .resolves.toEqual({ path: 'http://pod.example/foo/bar' });
  });

  it('should just take the first x-forwarded-* value.', async(): Promise<void> => {
    const altExtractor = createExtractor({ baseUrl: 'http://pod.example/' });
    const headers = {
      host: 'test.com',
      'x-forwarded-host': 'pod.example, another.domain',
      'x-forwarded-proto': 'http,https',
    };
    await expect(altExtractor.handle({ request: { url: '/foo/bar', headers } as any }))
      .resolves.toEqual({ path: 'http://pod.example/foo/bar' });
  });
});
