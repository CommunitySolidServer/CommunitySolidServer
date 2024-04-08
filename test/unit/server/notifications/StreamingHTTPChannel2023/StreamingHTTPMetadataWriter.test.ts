import { createResponse } from 'node-mocks-http';
import { StreamingHTTPMetadataWriter } from '../../../../../src/server/notifications/StreamingHTTPChannel2023/StreamingHTTPMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';

describe('A StreamingHTTPMetadataWriter', (): void => {
  const baseUrl = 'http://example.org/'
  const pathPrefix = '.notifications/StreamingHTTPChannel2023/'
  const writer = new StreamingHTTPMetadataWriter(baseUrl, pathPrefix);
  const rel = 'http://www.w3.org/ns/solid/terms#updatesViaStreamingHTTP2023'

  it('adds the correct link header.', async(): Promise<void> => {
    const response = createResponse() as HttpResponse;
    const metadata = new RepresentationMetadata({ path: 'http://example.org/foo/bar/baz' });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ link: `<http://example.org/.notifications/StreamingHTTPChannel2023/foo/bar/baz>; rel="${rel}"` });
  });
});
