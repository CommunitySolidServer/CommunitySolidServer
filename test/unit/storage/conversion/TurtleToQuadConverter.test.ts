import { Readable } from 'stream';
import { namedNode, triple } from '@rdfjs/data-model';
import arrayifyStream from 'arrayify-stream';
import streamifyArray from 'streamify-array';
import { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationPreferences } from '../../../../src/ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import { TurtleToQuadConverter } from '../../../../src/storage/conversion/TurtleToQuadConverter';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('A TurtleToQuadConverter', (): void => {
  const converter = new TurtleToQuadConverter();
  const identifier: ResourceIdentifier = { path: 'path' };

  it('can handle turtle to quad conversions.', async(): Promise<void> => {
    const representation = { metadata: { contentType: 'text/turtle' }} as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: INTERNAL_QUADS, weight: 1 }]};
    await expect(converter.canHandle({ identifier, representation, preferences })).resolves.toBeUndefined();
  });

  it('converts turtle to quads.', async(): Promise<void> => {
    const representation = {
      data: streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]),
      metadata: { contentType: 'text/turtle' },
    } as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: INTERNAL_QUADS, weight: 1 }]};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toEqual({
      binary: false,
      data: expect.any(Readable),
      metadata: {
        contentType: INTERNAL_QUADS,
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toEqualRdfQuadArray([ triple(
      namedNode('http://test.com/s'),
      namedNode('http://test.com/p'),
      namedNode('http://test.com/o'),
    ) ]);
  });

  it('throws an UnsupportedHttpError on invalid triple data.', async(): Promise<void> => {
    const representation = {
      data: streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.co' ]),
      metadata: { contentType: 'text/turtle' },
    } as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: INTERNAL_QUADS, weight: 1 }]};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toEqual({
      binary: false,
      data: expect.any(Readable),
      metadata: {
        contentType: INTERNAL_QUADS,
      },
    });
    await expect(arrayifyStream(result.data)).rejects.toThrow(UnsupportedHttpError);
  });
});
