import 'jest-rdf';
import { Readable } from 'node:stream';
import arrayifyStream from 'arrayify-stream';
import fetch, { Headers } from 'cross-fetch';
import { DataFactory } from 'n3';
import rdfParser from 'rdf-parse';
import { PREFERRED_PREFIX_TERM, SOLID_META } from '../../../../src';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { RepresentationPreferences } from '../../../../src/http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { RdfToQuadConverter } from '../../../../src/storage/conversion/RdfToQuadConverter';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';

const { namedNode, triple, literal, quad } = DataFactory;

// All of this is necessary to not break the cross-fetch imports that happen in `rdf-parse`
jest.mock('cross-fetch', (): any => {
  const mock = jest.fn();
  // Require the original module to not be mocked...
  const originalFetch = jest.requireActual('cross-fetch');
  return {
    __esModule: true,
    ...originalFetch,
    fetch: mock,
    default: mock,
  };
});

// Not mocking `fs` since this breaks the `rdf-parser` library
describe('A RdfToQuadConverter', (): void => {
  const fetchMock: jest.Mock = fetch as any;
  const converter = new RdfToQuadConverter();
  const identifier: ResourceIdentifier = { path: 'http://example.com/resource' };
  it('supports serializing as quads.', async(): Promise<void> => {
    const types = await rdfParser.getContentTypesPrioritized();
    // JSON is not supported
    delete types['application/json'];
    for (const [ type, priority ] of Object.entries(types)) {
      await expect(converter.getOutputTypes(type)).resolves.toEqual({ [INTERNAL_QUADS]: priority });
    }
  });

  it('may not handle application/json to quad conversion.', async(): Promise<void> => {
    await expect(converter.getOutputTypes('application/json')).resolves.toEqual({});
  });

  it('can handle turtle to quad conversions.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata('text/turtle');
    const representation = { metadata } as Representation;
    const preferences: RepresentationPreferences = { type: { [INTERNAL_QUADS]: 1 }};
    await expect(converter.canHandle({ identifier, representation, preferences })).resolves.toBeUndefined();
  });

  it('can handle JSON-LD to quad conversions.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata('application/ld+json');
    const representation = { metadata } as Representation;
    const preferences: RepresentationPreferences = { type: { [INTERNAL_QUADS]: 1 }};
    await expect(converter.canHandle({ identifier, representation, preferences })).resolves.toBeUndefined();
  });

  it('converts turtle to quads.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata('text/turtle');
    const representation = new BasicRepresentation(
      '<http://test.com/s> <http://test.com/p> <http://test.com/o>.',
      metadata,
    );
    const preferences: RepresentationPreferences = { type: { [INTERNAL_QUADS]: 1 }};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toEqual({
      binary: false,
      data: expect.any(Readable),
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.contentType).toEqual(INTERNAL_QUADS);
    await expect(arrayifyStream(result.data)).resolves.toEqualRdfQuadArray([ triple(
      namedNode('http://test.com/s'),
      namedNode('http://test.com/p'),
      namedNode('http://test.com/o'),
    ) ]);
  });

  it('emits on prefixes when converting turtle to quads.', async(): Promise<void> => {
    const id: ResourceIdentifier = { path: 'http://example.com/resource' };
    const metadata = new RepresentationMetadata('text/turtle');
    const representation = new BasicRepresentation(
      `@prefix foaf: <http://xmlns.com/foaf/0.1/> .

      <http://test.com/s> a foaf:Person.`,
      metadata,
    );
    const preferences: RepresentationPreferences = { type: { [INTERNAL_QUADS]: 1 }};
    const result = await converter.handle({ identifier: id, representation, preferences });
    expect(result).toEqual({
      binary: false,
      data: expect.any(Readable),
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.contentType).toEqual(INTERNAL_QUADS);
    await arrayifyStream(result.data);

    expect(result.metadata.quads(null, PREFERRED_PREFIX_TERM, null)).toBeRdfIsomorphic([
      quad(namedNode('http://xmlns.com/foaf/0.1/'), PREFERRED_PREFIX_TERM, literal('foaf'), SOLID_META.terms.ResponseMetadata),
    ]);
  });

  it('converts JSON-LD to quads.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata('application/ld+json');
    const representation = new BasicRepresentation(
      '{"@id": "http://test.com/s", "http://test.com/p": { "@id": "http://test.com/o" }}',
      metadata,
    );
    const preferences: RepresentationPreferences = { type: { [INTERNAL_QUADS]: 1 }};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toEqual({
      binary: false,
      data: expect.any(Readable),
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.contentType).toEqual(INTERNAL_QUADS);
    await expect(arrayifyStream(result.data)).resolves.toEqualRdfQuadArray([ triple(
      namedNode('http://test.com/s'),
      namedNode('http://test.com/p'),
      namedNode('http://test.com/o'),
    ) ]);
  });

  it('throws an BadRequestHttpError on invalid triple data.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata('text/turtle');
    const representation = new BasicRepresentation(
      '<http://test.com/s> <http://test.com/p> <http://test.co',
      metadata,
    );
    const preferences: RepresentationPreferences = { type: { [INTERNAL_QUADS]: 1 }};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toEqual({
      binary: false,
      data: expect.any(Readable),
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.contentType).toEqual(INTERNAL_QUADS);
    await expect(arrayifyStream(result.data)).rejects.toThrow(BadRequestHttpError);
  });

  it('can use locally stored contexts.', async(): Promise<void> => {
    const fetchedContext = {
      '@context': {
        '@version': 1.1,
        test: 'http://example.com/context2#',
        testPredicate2: { '@id': 'test:predicate2' },
      },
    };
    // This depends on the fields needed by the `jsonld-context-parser` so could break if library changes
    fetchMock.mockResolvedValueOnce({
      json: (): any => fetchedContext,
      status: 200,
      ok: true,
      headers: new Headers({ 'content-type': 'application/ld+json' }),
    });

    const contextConverter = new RdfToQuadConverter(
      { 'http://example.com/context.jsonld': '@css:test/assets/contexts/test.jsonld' },
    );
    const jsonld = {
      '@context': [ 'http://example.com/context.jsonld', 'http://example.com/context2.jsonld' ],
      '@id': 'http://example.com/resource',
      testPredicate: 123,
      testPredicate2: 456,
    };
    const representation = new BasicRepresentation(JSON.stringify(jsonld), 'application/ld+json');
    const preferences: RepresentationPreferences = { type: { [INTERNAL_QUADS]: 1 }};
    const result = await contextConverter.handle({ identifier, representation, preferences });
    await expect(arrayifyStream(result.data)).resolves.toEqualRdfQuadArray([ triple(
      namedNode('http://example.com/resource'),
      namedNode('http://example.com/context#predicate'),
      literal(123),
    ), triple(
      namedNode('http://example.com/resource'),
      namedNode('http://example.com/context2#predicate2'),
      literal(456),
    ) ]);
  });
});
