import arrayifyStream from 'arrayify-stream';
import { Readable } from 'stream';
import { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationPreferences } from '../../../../src/ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import streamifyArray from 'streamify-array';
import { TurtleToQuadConverter } from '../../../../src/storage/conversion/TurtleToQuadConverter';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';
import { CONTENT_TYPE_QUADS, DATA_TYPE_QUAD } from '../../../../src/util/ContentTypes';
import { namedNode, triple } from '@rdfjs/data-model';

describe('A TurtleToQuadConverter', (): void => {
  const converter = new TurtleToQuadConverter();
  const identifier: ResourceIdentifier = { path: 'path' };

  it('can handle turtle to quad conversions.', async(): Promise<void> => {
    const representation = { metadata: { contentType: 'text/turtle' }} as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: CONTENT_TYPE_QUADS, weight: 1 }]};
    await expect(converter.canHandle({ identifier, representation, preferences })).resolves.toBeUndefined();
  });

  it('converts turtle to quads.', async(): Promise<void> => {
    const representation = {
      data: streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]),
      metadata: { contentType: 'text/turtle' },
    } as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: CONTENT_TYPE_QUADS, weight: 1 }]};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toEqual({
      data: expect.any(Readable),
      dataType: DATA_TYPE_QUAD,
      metadata: {
        contentType: CONTENT_TYPE_QUADS,
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
    const preferences: RepresentationPreferences = { type: [{ value: CONTENT_TYPE_QUADS, weight: 1 }]};
    const result = await converter.handle({ identifier, representation, preferences });
    expect(result).toEqual({
      data: expect.any(Readable),
      dataType: DATA_TYPE_QUAD,
      metadata: {
        contentType: CONTENT_TYPE_QUADS,
      },
    });
    await expect(arrayifyStream(result.data)).rejects.toThrow(UnsupportedHttpError);
  });
});
