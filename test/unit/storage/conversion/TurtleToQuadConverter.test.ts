import { Readable } from 'stream';
import { namedNode, triple } from '@rdfjs/data-model';
import arrayifyStream from 'arrayify-stream';
import streamifyArray from 'streamify-array';
import { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import { RepresentationPreferences } from '../../../../src/ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import { TurtleToQuadConverter } from '../../../../src/storage/conversion/TurtleToQuadConverter';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';
import { CONTENT_TYPE } from '../../../../src/util/MetadataTypes';

describe('A TurtleToQuadConverter', (): void => {
  const converter = new TurtleToQuadConverter();
  const identifier: ResourceIdentifier = { path: 'path' };
  const metadata = new RepresentationMetadata();
  metadata.add(CONTENT_TYPE, 'text/turtle');

  it('can handle turtle to quad conversions.', async(): Promise<void> => {
    const representation = { metadata } as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: INTERNAL_QUADS, weight: 1 }]};
    await expect(converter.canHandle({ identifier, representation, preferences })).resolves.toBeUndefined();
  });

  it('converts turtle to quads.', async(): Promise<void> => {
    const representation = {
      data: streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]),
      metadata,
    } as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: INTERNAL_QUADS, weight: 1 }]};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toEqual({
      binary: false,
      data: expect.any(Readable),
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.get(CONTENT_TYPE)?.value).toEqual(INTERNAL_QUADS);
    await expect(arrayifyStream(result.data)).resolves.toEqualRdfQuadArray([ triple(
      namedNode('http://test.com/s'),
      namedNode('http://test.com/p'),
      namedNode('http://test.com/o'),
    ) ]);
  });

  it('throws an UnsupportedHttpError on invalid triple data.', async(): Promise<void> => {
    const representation = {
      data: streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.co' ]),
      metadata,
    } as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: INTERNAL_QUADS, weight: 1 }]};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toEqual({
      binary: false,
      data: expect.any(Readable),
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.get(CONTENT_TYPE)?.value).toEqual(INTERNAL_QUADS);
    await expect(arrayifyStream(result.data)).rejects.toThrow(UnsupportedHttpError);
  });
});
