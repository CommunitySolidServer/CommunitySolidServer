import { LinkRelObject, LinkRelParser } from '../../../../../src/http/input/metadata/LinkRelParser';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import { RDF, SOLID_META } from '../../../../../src/util/Vocabularies';

describe('A LinkParser', (): void => {
  const parser = new LinkRelParser({ type: new LinkRelObject('http://www.w3.org/1999/02/22-rdf-syntax-ns#type') });
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
    expect(metadata.get(RDF.terms.type)?.value).toBe('http://test.com/type');
  });

  it('supports multiple link headers.', async(): Promise<void> => {
    request.headers.link = [ '<http://test.com/typeA>;rel="type"', '<http://test.com/typeB>;rel=type' ];
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(2);
    expect(metadata.getAll(RDF.terms.type).map((term): any => term.value))
      .toEqual([ 'http://test.com/typeA', 'http://test.com/typeB' ]);
  });

  it('supports multiple link header values in the same entry.', async(): Promise<void> => {
    request.headers.link = '<http://test.com/typeA>;rel="type" , <http://test.com/typeB>;rel=type';
    await expect(parser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(2);
    expect(metadata.getAll(RDF.terms.type).map((term): any => term.value))
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

  it('ignores link headers that are not allowed.', async(): Promise<void> => {
    const linkRelObject = new LinkRelObject(
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      false,
      [ 'http://example.org/allowed' ],
    );
    const linkRelParser = new LinkRelParser({ type: linkRelObject });
    request.headers.link = '<http://example.org/notAllowed>;rel="type"';
    await expect(linkRelParser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('stores link headers with rel matching the given value as metadata and ignores not allowed.', async():
  Promise<void> => {
    const linkRelObject = new LinkRelObject(
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      false,
      [ 'http://example.org/allowed' ],
    );
    const linkRelParser = new LinkRelParser({ type: linkRelObject });
    request.headers.link = [ '<http://example.org/notAllowed>;rel="type"', '<http://example.org/allowed>;rel="type"' ];
    await expect(linkRelParser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(1);
    expect(metadata.get(RDF.terms.type)?.value).toBe('http://example.org/allowed');
  });

  it('stores link headers in the response metadata graph when configured ephemeral.', async():
  Promise<void> => {
    const linkRelObject = new LinkRelObject('http://www.w3.org/1999/02/22-rdf-syntax-ns#type', true);
    const linkRelParser = new LinkRelParser({ type: linkRelObject });
    request.headers.link = '<http://test.com/type>;rel="type"';

    await expect(linkRelParser.handle({ request, metadata })).resolves.toBeUndefined();
    expect(metadata.quads(null, null, null, SOLID_META.terms.ResponseMetadata)).toHaveLength(1);
    expect(metadata.get(RDF.terms.type)?.value).toBe('http://test.com/type');
  });
});
