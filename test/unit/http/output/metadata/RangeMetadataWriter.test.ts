import { createResponse } from 'node-mocks-http';
import { RangeMetadataWriter } from '../../../../../src/http/output/metadata/RangeMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import { SOLID_HTTP } from '../../../../../src/util/Vocabularies';

describe('RangeMetadataWriter', (): void => {
  let metadata: RepresentationMetadata;
  let response: HttpResponse;
  let writer: RangeMetadataWriter;

  beforeEach(async(): Promise<void> => {
    metadata = new RepresentationMetadata();
    response = createResponse();
    writer = new RangeMetadataWriter();
  });

  it('adds the content-range header.', async(): Promise<void> => {
    metadata.set(SOLID_HTTP.terms.unit, 'bytes');
    metadata.set(SOLID_HTTP.terms.start, '1');
    metadata.set(SOLID_HTTP.terms.end, '5');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({
      'content-range': 'bytes 1-5/*',
    });
  });

  it('uses * if the value is unknown.', async(): Promise<void> => {
    metadata.set(SOLID_HTTP.terms.unit, 'bytes');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({
      'content-range': 'bytes *-*/*',
    });
  });

  it('does nothing if there is no range metadata.', async(): Promise<void> => {
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ });
  });
});
