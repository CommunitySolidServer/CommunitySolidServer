import { NotImplementedHttpError } from '../../../../../src';
import { PlainJsonLdFilter } from '../../../../../src/http/input/metadata/PlainJsonLdFilter';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';

describe('A PlainJsonLdFilter', (): void => {
  const parser = new PlainJsonLdFilter();
  let request: HttpRequest;
  let metadata: RepresentationMetadata;

  beforeEach(async(): Promise<void> => {
    request = { headers: {}} as HttpRequest;
    metadata = new RepresentationMetadata();
  });

  it('does nothing if there are no type headers.', async(): Promise<void> => {
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('does allow content-type application/json on its own.', async(): Promise<void> => {
    request.headers['content-type'] = 'application/json';
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('does allow a correct content-type and link headers combination.', async(): Promise<void> => {
    request.headers['content-type'] = 'application/json+ld';
    request.headers.link = '<https://json-ld.org/contexts/person.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"';
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('throws error when content-type and link header are in conflict.', async(): Promise<void> => {
    request.headers['content-type'] = 'application/json';
    request.headers.link = '<https://json-ld.org/contexts/person.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"';
    await expect(parser.handle({ request, metadata })).rejects.toThrow(NotImplementedHttpError);
    expect(metadata.quads()).toHaveLength(0);
  });

  it('throws error when at least 1 content-type and link header are in conflict.', async(): Promise<void> => {
    request.headers['content-type'] = 'application/json';
    request.headers.link = [
      '<http://test.com/type>; rel="type"',
      '<https://json-ld.org/contexts/person.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"',
    ];
    await expect(parser.handle({ request, metadata })).rejects.toThrow(NotImplementedHttpError);
    expect(metadata.quads()).toHaveLength(0);
  });

  it('ignores invalid link headers.', async(): Promise<void> => {
    request.headers['content-type'] = 'application/json';
    request.headers.link = 'http://test.com/type;rel="type"';
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('ignores empty content-type headers.', async(): Promise<void> => {
    request.headers.link = '<http://test.com/type>;rel="type"';
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });
});
