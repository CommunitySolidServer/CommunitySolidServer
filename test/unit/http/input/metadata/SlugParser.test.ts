import { SlugParser } from '../../../../../src/http/input/metadata/SlugParser';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';
import { SOLID_HTTP } from '../../../../../src/util/Vocabularies';

describe('A SlugParser', (): void => {
  const parser = new SlugParser();
  let request: HttpRequest;
  let metadata: RepresentationMetadata;

  beforeEach(async(): Promise<void> => {
    request = { headers: {}} as HttpRequest;
    metadata = new RepresentationMetadata();
  });

  it('does nothing if there is no slug header.', async(): Promise<void> => {
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('errors if there are multiple slug headers.', async(): Promise<void> => {
    request.headers.slug = [ 'slugA', 'slugB' ];
    const result = parser.handle({ request, metadata });
    await expect(result).rejects.toThrow(BadRequestHttpError);
    await expect(result).rejects.toThrow('Request has multiple Slug headers');
  });

  it('stores the slug metadata.', async(): Promise<void> => {
    request.headers.slug = 'slugA';
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(1);
    expect(metadata.get(SOLID_HTTP.terms.slug)?.value).toBe('slugA');
  });
});
