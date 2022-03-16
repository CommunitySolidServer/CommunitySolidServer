import { DataFactory } from 'n3';
import { CookieParser } from '../../../../../src/http/input/metadata/CookieParser';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import namedNode = DataFactory.namedNode;

describe('A CookieParser', (): void => {
  const parser = new CookieParser({ custom1: 'http://example.com/pred1', custom2: 'http://example.com/pred2' });
  let request: HttpRequest;
  let metadata: RepresentationMetadata;

  beforeEach(async(): Promise<void> => {
    request = { headers: {}} as HttpRequest;
    metadata = new RepresentationMetadata();
  });

  it('does nothing if there is no cookie header.', async(): Promise<void> => {
    await parser.handle({ request, metadata });
    expect(metadata.quads()).toHaveLength(0);
  });

  it('converts the authorization header to the relevant triple.', async(): Promise<void> => {
    request.headers.cookie = 'custom1=my-value;unknown=unknown-value;custom2=other-value';
    await parser.handle({ request, metadata });
    expect(metadata.quads()).toHaveLength(2);
    expect(metadata.get(namedNode('http://example.com/pred1'))?.value).toBe('my-value');
    expect(metadata.get(namedNode('http://example.com/pred2'))?.value).toBe('other-value');
  });
});
