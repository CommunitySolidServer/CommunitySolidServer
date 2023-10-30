import { createResponse } from 'node-mocks-http';
import { WwwAuthMetadataWriter } from '../../../../../src/http/output/metadata/WwwAuthMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import { HTTP } from '../../../../../src/util/Vocabularies';

describe('A WwwAuthMetadataWriter', (): void => {
  const auth = 'Bearer scope="openid webid"';
  const writer = new WwwAuthMetadataWriter(auth);
  let response: HttpResponse;

  beforeEach(async(): Promise<void> => {
    response = createResponse() as HttpResponse;
  });

  it('adds no header if there is no relevant metadata.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata();
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
  });

  it('adds no header if the status code is not 401.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [HTTP.statusCodeNumber]: '403' });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
  });

  it('adds a WWW-Authenticate header if the status code is 401.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ [HTTP.statusCodeNumber]: '401' });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();

    expect(response.getHeaders()).toEqual({
      'www-authenticate': auth,
    });
  });
});
