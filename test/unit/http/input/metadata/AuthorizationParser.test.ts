import { DataFactory } from 'n3';
import { AuthorizationParser } from '../../../../../src/http/input/metadata/AuthorizationParser';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import namedNode = DataFactory.namedNode;

describe('An AuthorizationParser', (): void => {
  const parser = new AuthorizationParser({ custom: 'http://example.com/pred' });
  let request: HttpRequest;
  let metadata: RepresentationMetadata;

  beforeEach(async(): Promise<void> => {
    request = { headers: {}} as HttpRequest;
    metadata = new RepresentationMetadata();
  });

  it('does nothing if there is no authorization header.', async(): Promise<void> => {
    await parser.handle({ request, metadata });
    expect(metadata.quads()).toHaveLength(0);
  });

  it('converts the authorization header to the relevant triple.', async(): Promise<void> => {
    request.headers.authorization = 'custom my-value';
    await parser.handle({ request, metadata });
    expect(metadata.quads()).toHaveLength(1);
    expect(metadata.get(namedNode('http://example.com/pred'))?.value).toBe('my-value');
  });

  it('ignores unknown values.', async(): Promise<void> => {
    request.headers.authorization = 'unknown my-value';
    await parser.handle({ request, metadata });
    expect(metadata.quads()).toHaveLength(0);
  });
});
