import { DataFactory } from 'n3';
import { createResponse } from 'node-mocks-http';
import { CookieMetadataWriter } from '../../../../../src/http/output/metadata/CookieMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import namedNode = DataFactory.namedNode;
import literal = DataFactory.literal;

describe('A CookieMetadataWriter', (): void => {
  const writer = new CookieMetadataWriter({
    'http://example.com/pred1': { name: 'custom1' },
    'http://example.com/pred2': { name: 'custom2', expirationUri: 'http://example.com/pred2expiration' },
  });
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
    const date = new Date('2015-10-21T07:28:00.000Z');
    metadata.add(namedNode('http://example.com/pred1'), literal('my-value'));
    metadata.add(namedNode('http://example.com/pred2'), literal('other-value'));
    metadata.add(namedNode('http://example.com/pred2expiration'), literal(date.toISOString()));
    metadata.add(namedNode('http://example.com/unknown'), literal('unknown-value'));
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeader('set-cookie')).toEqual([
      'custom1=my-value; Path=/; SameSite=Lax',
      'custom2=other-value; Path=/; Expires=Wed, 21 Oct 2015 07:28:00 GMT; SameSite=Lax',
    ]);
  });
});
