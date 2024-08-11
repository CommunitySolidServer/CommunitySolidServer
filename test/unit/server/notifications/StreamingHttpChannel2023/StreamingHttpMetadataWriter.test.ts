import { createResponse } from 'node-mocks-http';
import {
  StreamingHttpMetadataWriter,
} from '../../../../../src/server/notifications/StreamingHttpChannel2023/StreamingHttpMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';

describe('A StreamingHttpMetadataWriter', (): void => {
  const baseUrl = 'http://example.org/';
  const pathPrefix = '.notifications/StreamingHTTPChannel2023/';
  const writer = new StreamingHttpMetadataWriter(baseUrl, pathPrefix);
  const rel = 'http://www.w3.org/ns/solid/terms#updatesViaStreamingHttp2023';

  it('adds the correct link header.', async(): Promise<void> => {
    const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
    const response = createResponse() as HttpResponse;
    const metadata = new RepresentationMetadata(topic);
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ link: `<http://example.org/.notifications/StreamingHTTPChannel2023/${encodeURIComponent(topic.path)}>; rel="${rel}"` });
  });
});
