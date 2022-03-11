import { ContentTypeParser } from '../../../../../src/http/input/metadata/ContentTypeParser';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
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
    expect(metadata.quads()).toHaveLength(4);
    expect(metadata.contentType).toBe('text/plain');
    expect(metadata.contentTypeObject).toEqual({
      value: 'text/plain',
      parameters: {
        charset: 'UTF-8',
      },
    });
  });
});
