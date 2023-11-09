import { createResponse } from 'node-mocks-http';
import { ContentTypeMetadataWriter } from '../../../../../src/http/output/metadata/ContentTypeMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import { ContentType } from '../../../../../src/util/Header';

describe('A ContentTypeMetadataWriter', (): void => {
  const writer = new ContentTypeMetadataWriter();
  let response: HttpResponse;

  beforeEach(async(): Promise<void> => {
    response = createResponse() as HttpResponse;
  });

  it('adds no header if there is no relevant metadata.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata();
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
  });

  it('adds a Content-Type header with parameters if present.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata(new ContentType('text/plain', { charset: 'utf-8' }));
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();

    expect(response.getHeaders()).toEqual({
      'content-type': 'text/plain; charset=utf-8',
    });
  });

  it('adds a Content-Type header without parameters.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata('text/plain');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();

    expect(response.getHeaders()).toEqual({
      'content-type': 'text/plain',
    });
  });
});
