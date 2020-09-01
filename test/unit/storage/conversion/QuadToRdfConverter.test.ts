import { namedNode, triple } from '@rdfjs/data-model';
import rdfSerializer from 'rdf-serialize';
import stringifyStream from 'stream-to-string';
import streamifyArray from 'streamify-array';
import { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationPreferences } from '../../../../src/ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import { QuadToRdfConverter } from '../../../../src/storage/conversion/QuadToRdfConverter';
import { CONTENT_TYPE_QUADS, DATA_TYPE_BINARY } from '../../../../src/util/ContentTypes';

describe('A QuadToRdfConverter', (): void => {
  const converter = new QuadToRdfConverter();
  const identifier: ResourceIdentifier = { path: 'path' };

  it('supports parsing quads.', async(): Promise<void> => {
    await expect(converter.getInputTypes()).resolves.toEqual({ [CONTENT_TYPE_QUADS]: 1 });
  });

  it('supports serializing as the same types as rdfSerializer.', async(): Promise<void> => {
    await expect(converter.getOutputTypes()).resolves.toEqual(await rdfSerializer.getContentTypesPrioritized());
  });

  it('can handle quad to turtle conversions.', async(): Promise<void> => {
    const representation = { metadata: { contentType: CONTENT_TYPE_QUADS }} as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: 'text/turtle', weight: 1 }]};
    await expect(converter.canHandle({ identifier, representation, preferences })).resolves.toBeUndefined();
  });

  it('can handle quad to JSON-LD conversions.', async(): Promise<void> => {
    const representation = { metadata: { contentType: CONTENT_TYPE_QUADS }} as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: 'application/ld+json', weight: 1 }]};
    await expect(converter.canHandle({ identifier, representation, preferences })).resolves.toBeUndefined();
  });

  it('converts quads to turtle.', async(): Promise<void> => {
    const representation = {
      data: streamifyArray([ triple(
        namedNode('http://test.com/s'),
        namedNode('http://test.com/p'),
        namedNode('http://test.com/o'),
      ) ]),
      metadata: { contentType: CONTENT_TYPE_QUADS },
    } as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: 'text/turtle', weight: 1 }]};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toMatchObject({
      dataType: DATA_TYPE_BINARY,
      metadata: {
        contentType: 'text/turtle',
      },
    });
    await expect(stringifyStream(result.data)).resolves.toEqual(
      `<http://test.com/s> <http://test.com/p> <http://test.com/o>.
`,
    );
  });

  it('converts quads to JSON-LD.', async(): Promise<void> => {
    const representation = {
      data: streamifyArray([ triple(
        namedNode('http://test.com/s'),
        namedNode('http://test.com/p'),
        namedNode('http://test.com/o'),
      ) ]),
      metadata: { contentType: CONTENT_TYPE_QUADS },
    } as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: 'application/ld+json', weight: 1 }]};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toMatchObject({
      dataType: DATA_TYPE_BINARY,
      metadata: {
        contentType: 'application/ld+json',
      },
    });
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
