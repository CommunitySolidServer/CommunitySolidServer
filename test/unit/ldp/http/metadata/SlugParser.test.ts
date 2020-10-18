import { SlugParser } from '../../../../../src/ldp/http/metadata/SlugParser';
import { RepresentationMetadata } from '../../../../../src/ldp/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import { UnsupportedHttpError } from '../../../../../src/util/errors/UnsupportedHttpError';
import { HTTP } from '../../../../../src/util/UriConstants';

describe('A SlugParser', (): void => {
  const parser = new SlugParser();
  let request: HttpRequest;
  let metadata: RepresentationMetadata;

  beforeEach(async(): Promise<void> => {
    request = { headers: {}} as HttpRequest;
    metadata = new RepresentationMetadata();
  });

  it('does nothing if there is no slug header.', async(): Promise<void> => {
    await expect(parser.parse(request, metadata)).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('errors if there are multiple slug headers.', async(): Promise<void> => {
    request.headers.slug = [ 'slugA', 'slugB' ];
    await expect(parser.parse(request, metadata))
      .rejects.toThrow(new UnsupportedHttpError('At most 1 slug header is allowed.'));
  });

  it('stores the slug metadata.', async(): Promise<void> => {
    request.headers.slug = 'slugA';
    await expect(parser.parse(request, metadata)).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(1);
    expect(metadata.get(HTTP.slug)?.value).toBe('slugA');
  });
});
