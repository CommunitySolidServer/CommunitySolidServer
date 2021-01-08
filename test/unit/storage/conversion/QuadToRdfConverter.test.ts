import { namedNode, triple } from '@rdfjs/data-model';
import rdfSerializer from 'rdf-serialize';
import stringifyStream from 'stream-to-string';
import streamifyArray from 'streamify-array';
import type { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import type { RepresentationPreferences } from '../../../../src/ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import { QuadToRdfConverter } from '../../../../src/storage/conversion/QuadToRdfConverter';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { CONTENT_TYPE, DC, PREFERRED_PREFIX_TERM } from '../../../../src/util/Vocabularies';

describe('A QuadToRdfConverter', (): void => {
  const converter = new QuadToRdfConverter();
  const identifier: ResourceIdentifier = { path: 'path' };
  let metadata: RepresentationMetadata;

  beforeEach((): void => {
    metadata = new RepresentationMetadata({ [CONTENT_TYPE]: INTERNAL_QUADS });
  });

  it('supports parsing quads.', async(): Promise<void> => {
    await expect(new QuadToRdfConverter().getInputTypes())
      .resolves.toEqual({ [INTERNAL_QUADS]: 1 });
  });

  it('defaults to rdfSerializer preferences when given no output preferences.', async(): Promise<void> => {
    await expect(new QuadToRdfConverter().getOutputTypes())
      .resolves.toEqual(await rdfSerializer.getContentTypesPrioritized());
  });

  it('supports overriding output preferences.', async(): Promise<void> => {
    const outputPreferences = { 'text/turtle': 1 };
    await expect(new QuadToRdfConverter({ outputPreferences }).getOutputTypes())
      .resolves.toEqual(outputPreferences);
  });

  it('can handle quad to turtle conversions.', async(): Promise<void> => {
    const representation = { metadata } as Representation;
    const preferences: RepresentationPreferences = { type: { 'text/turtle': 1 }};
    await expect(converter.canHandle({ identifier, representation, preferences })).resolves.toBeUndefined();
  });

  it('can handle quad to JSON-LD conversions.', async(): Promise<void> => {
    const representation = { metadata } as Representation;
    const preferences: RepresentationPreferences = { type: { 'application/ld+json': 1 }};
    await expect(converter.canHandle({ identifier, representation, preferences })).resolves.toBeUndefined();
  });

  it('converts quads to turtle.', async(): Promise<void> => {
    const representation = {
      data: streamifyArray([ triple(
        namedNode('http://test.com/s'),
        namedNode('http://test.com/p'),
        namedNode('http://test.com/o'),
      ) ]),
      metadata,
    } as Representation;
    const preferences: RepresentationPreferences = { type: { 'text/turtle': 1 }};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toMatchObject({
      binary: true,
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.contentType).toEqual('text/turtle');
    await expect(stringifyStream(result.data)).resolves.toEqual(
      `<http://test.com/s> <http://test.com/p> <http://test.com/o>.
`,
    );
  });

  it('converts quads with prefixes to turtle.', async(): Promise<void> => {
    metadata.addQuad(DC.terms.namespace, PREFERRED_PREFIX_TERM, 'dc');
    metadata.addQuad('http://test.com/', PREFERRED_PREFIX_TERM, 'test');
    const representation = {
      data: streamifyArray([ triple(
        namedNode('http://test.com/s'),
        DC.terms.modified,
        namedNode('http://test.com/o'),
      ) ]),
      metadata,
    } as Representation;
    const preferences: RepresentationPreferences = { type: { 'text/turtle': 1 }};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toMatchObject({
      binary: true,
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.contentType).toEqual('text/turtle');
    await expect(stringifyStream(result.data)).resolves.toEqual(
      `@prefix dc: <http://purl.org/dc/terms/>.
@prefix test: <http://test.com/>.

test:s dc:modified test:o.
`,
    );
  });

  it('converts quads to JSON-LD.', async(): Promise<void> => {
    metadata.contentType = INTERNAL_QUADS;
    const representation = {
      data: streamifyArray([ triple(
        namedNode('http://test.com/s'),
        namedNode('http://test.com/p'),
        namedNode('http://test.com/o'),
      ) ]),
      metadata,
    } as Representation;
    const preferences: RepresentationPreferences = { type: { 'application/ld+json': 1 }};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toMatchObject({
      binary: true,
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.contentType).toEqual('application/ld+json');
    await expect(stringifyStream(result.data)).resolves.toEqual(
      `[
  {
    "@id": "http://test.com/s",
    "http://test.com/p": [
      {
        "@id": "http://test.com/o"
      }
    ]
  }
]
`,
    );
  });
});
