import { ContentLengthParser } from '../../../../../src/http/input/metadata/ContentLengthParser';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';

describe('A ContentLengthParser', (): void => {
  const parser = new ContentLengthParser();
  let request: HttpRequest;
  let metadata: RepresentationMetadata;

  beforeEach(async(): Promise<void> => {
    request = { headers: {}} as HttpRequest;
    metadata = new RepresentationMetadata();
  });

  it('does nothing if there is no content-length header.', async(): Promise<void> => {
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('sets the given content-length as metadata.', async(): Promise<void> => {
    request.headers['content-length'] = '50';
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(1);
    expect(metadata.contentLength).toBe(50);
  });

  it('does not set a content-length when the header is invalid.', async(): Promise<void> => {
    request.headers['content-length'] = 'aabbcc50ccbbaa';
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });
});
