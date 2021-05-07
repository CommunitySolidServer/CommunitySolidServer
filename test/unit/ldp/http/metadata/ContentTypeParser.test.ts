import { ContentTypeParser } from '../../../../../src/ldp/http/metadata/ContentTypeParser';
import { RepresentationMetadata } from '../../../../../src/ldp/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';

describe('A ContentTypeParser', (): void => {
  const parser = new ContentTypeParser();
  let request: HttpRequest;
  let metadata: RepresentationMetadata;

  beforeEach(async(): Promise<void> => {
    request = { headers: {}} as HttpRequest;
    metadata = new RepresentationMetadata();
  });

  it('does nothing if there is no content-type header.', async(): Promise<void> => {
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('sets the given content-type as metadata.', async(): Promise<void> => {
    request.headers['content-type'] = 'text/plain;charset=UTF-8';
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(1);
    expect(metadata.contentType).toBe('text/plain');
  });
});
