import { createResponse } from 'node-mocks-http';
import { RangeMetadataWriter } from '../../../../../src/http/output/metadata/RangeMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import { POSIX, SOLID_HTTP } from '../../../../../src/util/Vocabularies';

describe('RangeMetadataWriter', (): void => {
  let metadata: RepresentationMetadata;
  let response: HttpResponse;
  let writer: RangeMetadataWriter;

  beforeEach(async(): Promise<void> => {
    metadata = new RepresentationMetadata();
    response = createResponse() as HttpResponse;
    writer = new RangeMetadataWriter();
  });

  it('adds the content-range and content-length header.', async(): Promise<void> => {
    metadata.set(SOLID_HTTP.terms.unit, 'bytes');
    metadata.set(SOLID_HTTP.terms.start, '1');
    metadata.set(SOLID_HTTP.terms.end, '5');
    metadata.set(POSIX.terms.size, '10');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({
      'content-range': 'bytes 1-5/10',
      'content-length': '5',
    });
  });

  it('uses * if a value is unknown.', async(): Promise<void> => {
    metadata.set(SOLID_HTTP.terms.unit, 'bytes');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({
      'content-range': 'bytes *-*/*',
    });
  });

  it('does nothing if there is no range metadata.', async(): Promise<void> => {
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
  });

  it('adds a content-length header if the size is known.', async(): Promise<void> => {
    metadata.set(POSIX.terms.size, '10');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({
      'content-length': '10',
    });
  });

  it('correctly deduces end values if the size is known.', async(): Promise<void> => {
    metadata.set(SOLID_HTTP.terms.unit, 'bytes');
    metadata.set(SOLID_HTTP.terms.start, '4');
    metadata.set(POSIX.terms.size, '10');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({
      'content-range': 'bytes 4-9/10',
      'content-length': '6',
    });
  });

  it('correctly handles negative start values.', async(): Promise<void> => {
    metadata.set(SOLID_HTTP.terms.unit, 'bytes');
    metadata.set(SOLID_HTTP.terms.start, '-4');
    metadata.set(POSIX.terms.size, '10');
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({
      'content-range': 'bytes 6-9/10',
      'content-length': '4',
    });
  });
});
