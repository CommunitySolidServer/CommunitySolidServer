import { LinkRelParser } from '../../../../../src/http/input/metadata/LinkRelParser';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import { RDF } from '../../../../../src/util/Vocabularies';

describe('A LinkParser', (): void => {
  const parser = new LinkRelParser({ type: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' });
  let request: HttpRequest;
  let metadata: RepresentationMetadata;

  beforeEach(async(): Promise<void> => {
    request = { headers: {}} as HttpRequest;
    metadata = new RepresentationMetadata();
  });

  it('does nothing if there are no type headers.', async(): Promise<void> => {
    await parser.handle({ request, metadata });
    expect(metadata.quads()).toHaveLength(0);
  });

  it('stores link headers with rel matching the given value as metadata.', async(): Promise<void> => {
    request.headers.link = '<http://test.com/type>;rel="type"';
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(1);
    expect(metadata.get(RDF.type)?.value).toBe('http://test.com/type');
  });

  it('supports multiple link headers.', async(): Promise<void> => {
    request.headers.link = [ '<http://test.com/typeA>;rel="type"', '<http://test.com/typeB>;rel=type' ];
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(2);
    expect(metadata.getAll(RDF.type).map((term): any => term.value))
      .toEqual([ 'http://test.com/typeA', 'http://test.com/typeB' ]);
  });

  it('supports multiple link header values in the same entry.', async(): Promise<void> => {
    request.headers.link = '<http://test.com/typeA>;rel="type" , <http://test.com/typeB>;rel=type';
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(2);
    expect(metadata.getAll(RDF.type).map((term): any => term.value))
      .toEqual([ 'http://test.com/typeA', 'http://test.com/typeB' ]);
  });

  it('ignores invalid link headers.', async(): Promise<void> => {
    request.headers.link = 'http://test.com/type;rel="type"';
    await parser.handle({ request, metadata });
    expect(metadata.quads()).toHaveLength(0);
  });

  it('ignores non-type link headers.', async(): Promise<void> => {
    request.headers.link = '<http://test.com/typeA>;rel="notype" , <http://test.com/typeB>';
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });
});
