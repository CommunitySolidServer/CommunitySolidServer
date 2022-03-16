import { DataFactory } from 'n3';
import { createResponse } from 'node-mocks-http';
import { CookieMetadataWriter } from '../../../../../src/http/output/metadata/CookieMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import namedNode = DataFactory.namedNode;
import literal = DataFactory.literal;

describe('A CookieMetadataWriter', (): void => {
  const writer = new CookieMetadataWriter({ 'http://example.com/pred1': 'custom1', 'http://example.com/pred2': 'custom2' });
  let metadata: RepresentationMetadata;
  let response: HttpResponse;

  beforeEach(async(): Promise<void> => {
    metadata = new RepresentationMetadata();
    response = createResponse() as HttpResponse;
  });

  it('adds no headers if there is no relevant metadata.', async(): Promise<void> => {
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
  });

  it('adds the relevant set-cookie headers.', async(): Promise<void> => {
    metadata.add(namedNode('http://example.com/pred1'), literal('my-value'));
    metadata.add(namedNode('http://example.com/pred2'), literal('other-value'));
    metadata.add(namedNode('http://example.com/unknown'), literal('unknown-value'));
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeader('set-cookie')).toEqual([
      'custom1=my-value; Path=/; SameSite=Lax',
      'custom2=other-value; Path=/; SameSite=Lax',
    ]);
  });
});
